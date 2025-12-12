import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import select

from ..core.deps import DbSession, CurrentUser
from ..models.transaction import Transaction
from ..models.category import Category

router = APIRouter(prefix="/import", tags=["CSV Import"])


class CSVPreviewRow(BaseModel):
    row_number: int
    date: Optional[str]
    amount: Optional[str]
    description: Optional[str]
    is_valid: bool
    error: Optional[str] = None


class CSVPreviewResponse(BaseModel):
    columns: list[str]
    sample_rows: list[dict]
    total_rows: int


class ColumnMapping(BaseModel):
    date_column: str
    amount_column: str
    description_column: Optional[str] = None
    date_format: str = "%Y-%m-%d"  # Default format


class ImportConfirmRequest(BaseModel):
    mapping: ColumnMapping
    category_id: str
    is_income: bool = False
    household_id: Optional[str] = None
    negate_amounts: bool = False  # For bank statements where expenses are negative


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str]


@router.post("/csv/preview", response_model=CSVPreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    current_user: CurrentUser = None
):
    """Upload CSV and preview columns/data."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )

    content = await file.read()

    # Try different encodings
    for encoding in ['utf-8', 'cp1250', 'iso-8859-2', 'windows-1252']:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode file. Please use UTF-8 encoding."
        )

    # Parse CSV
    try:
        reader = csv.DictReader(io.StringIO(text), delimiter=';')
        if not reader.fieldnames:
            # Try comma delimiter
            reader = csv.DictReader(io.StringIO(text), delimiter=',')

        columns = list(reader.fieldnames or [])
        if not columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not detect CSV columns"
            )

        # Get sample rows
        sample_rows = []
        for i, row in enumerate(reader):
            if i >= 5:  # Only first 5 rows
                break
            sample_rows.append(dict(row))

        # Count total rows
        text_lines = text.strip().split('\n')
        total_rows = len(text_lines) - 1  # Subtract header

        return CSVPreviewResponse(
            columns=columns,
            sample_rows=sample_rows,
            total_rows=total_rows
        )
    except csv.Error as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV parsing error: {str(e)}"
        )


@router.post("/csv/confirm", response_model=ImportResult)
async def confirm_import(
    file: UploadFile = File(...),
    mapping: str = None,  # JSON string of ColumnMapping
    category_id: str = None,
    is_income: bool = False,
    household_id: Optional[str] = None,
    negate_amounts: bool = False,
    date_format: str = "%Y-%m-%d",
    date_column: str = None,
    amount_column: str = None,
    description_column: Optional[str] = None,
    db: DbSession = None,
    current_user: CurrentUser = None
):
    """Import CSV transactions."""
    if not date_column or not amount_column or not category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_column, amount_column, and category_id are required"
        )

    # Verify category
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    content = await file.read()

    # Decode
    for encoding in ['utf-8', 'cp1250', 'iso-8859-2', 'windows-1252']:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode file"
        )

    # Parse and import
    reader = csv.DictReader(io.StringIO(text), delimiter=';')
    if date_column not in (reader.fieldnames or []):
        reader = csv.DictReader(io.StringIO(text), delimiter=',')

    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader):
        try:
            # Parse date
            date_str = row.get(date_column, '').strip()
            if not date_str:
                skipped += 1
                continue

            # Try multiple date formats
            parsed_date = None
            formats_to_try = [date_format, "%d.%m.%Y", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"]
            for fmt in formats_to_try:
                try:
                    parsed_date = datetime.strptime(date_str, fmt).date()
                    break
                except ValueError:
                    continue

            if not parsed_date:
                errors.append(f"Row {i+2}: Could not parse date '{date_str}'")
                skipped += 1
                continue

            # Parse amount
            amount_str = row.get(amount_column, '').strip()
            amount_str = amount_str.replace(',', '.').replace(' ', '')
            try:
                amount = Decimal(amount_str)
                if negate_amounts:
                    amount = -amount
                amount = abs(amount)  # Store as positive
            except (InvalidOperation, ValueError):
                errors.append(f"Row {i+2}: Invalid amount '{amount_str}'")
                skipped += 1
                continue

            if amount <= 0:
                skipped += 1
                continue

            # Get description
            description = row.get(description_column, '').strip() if description_column else None

            # Create transaction
            transaction = Transaction(
                user_id=current_user.id,
                category_id=category_id,
                amount=amount,
                description=description,
                date=parsed_date,
                household_id=household_id,
                is_shared=household_id is not None
            )
            db.add(transaction)
            imported += 1

        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")
            skipped += 1

    await db.commit()

    return ImportResult(
        imported=imported,
        skipped=skipped,
        errors=errors[:10]  # Only first 10 errors
    )
