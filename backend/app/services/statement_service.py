import csv
import io
from datetime import datetime, timezone
from typing import Dict, List, Tuple

from app.models.customer_model import Customer
from app.models.transaction_model import Transaction, TransactionStatus


class StatementService:
    """Generate account statements for customers (PDF/CSV)."""

    @staticmethod
    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    @staticmethod
    def _mask_account_number(account_number: str) -> str:
        """Mask account number showing only last 4 digits."""
        if not account_number or len(account_number) < 4:
            return "****"
        return f"****{account_number[-4:]}"

    @classmethod
    def _get_transactions_in_range(
        cls, user_id: str, start_date: datetime, end_date: datetime
    ) -> List[Transaction]:
        """Fetch transactions for user within date range."""
        return (
            Transaction.query.filter_by(created_by=user_id)
            .filter(Transaction.created_at >= start_date)
            .filter(Transaction.created_at <= end_date)
            .order_by(Transaction.created_at.asc())
            .all()
        )

    @classmethod
    def _calculate_balances(
        cls, customer: Customer, transactions: List[Transaction]
    ) -> Tuple[float, float]:
        """Calculate opening and closing balance for statement period."""
        current_balance = float(customer.balance or 0.0)
        
        # Calculate total debits in period
        total_debits = sum(
            float(tx.amount)
            for tx in transactions
            if tx.from_account == customer.account_number
            and tx.status != TransactionStatus.REJECTED
        )
        
        # Calculate total credits in period
        total_credits = sum(
            float(tx.amount)
            for tx in transactions
            if tx.to_account == customer.account_number
            and tx.status != TransactionStatus.REJECTED
        )
        
        # Opening balance = current - (credits - debits)
        opening_balance = current_balance - (total_credits - total_debits)
        closing_balance = current_balance
        
        return round(opening_balance, 2), round(closing_balance, 2)

    @classmethod
    def generate_statement_data(
        cls, user_id: str, start_date: datetime, end_date: datetime
    ) -> Dict:
        """Generate statement data for a customer."""
        customer = Customer.query.get(user_id)
        
        if not customer:
            raise ValueError("Customer account not found")
        
        # Fetch transactions in date range
        transactions = cls._get_transactions_in_range(user_id, start_date, end_date)
        
        # Calculate balances
        opening_balance, closing_balance = cls._calculate_balances(customer, transactions)
        
        # Get account type
        account_type = "SAVINGS"
        if hasattr(customer, 'account_type') and customer.account_type:
            account_type = customer.account_type.value if hasattr(customer.account_type, 'value') else str(customer.account_type)
        
        # Get branch code
        branch_code = getattr(customer, 'branch_code', 'MUM-HQ') or 'MUM-HQ'
        
        # Get account status
        account_status = "ACTIVE"
        if hasattr(customer, 'status') and customer.status:
            account_status = customer.status.value if hasattr(customer.status, 'value') else str(customer.status)
        
        # Prepare transaction list
        transaction_list = []
        for tx in transactions:
            direction = "DEBIT" if tx.from_account == customer.account_number else "CREDIT"
            transaction_list.append({
                "date": tx.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "transaction_id": tx.id,
                "from_account": cls._mask_account_number(tx.from_account),
                "to_account": cls._mask_account_number(tx.to_account),
                "purpose": tx.purpose or "",
                "amount": float(tx.amount),
                "direction": direction,
                "status": tx.status.value if tx.status else "UNKNOWN",
            })
        
        return {
            "account_holder": customer.name,
            "account_number": customer.account_number,
            "account_number_masked": cls._mask_account_number(customer.account_number),
            "account_type": account_type,
            "account_status": account_status,
            "branch_code": branch_code,
            "statement_period": {
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
            },
            "opening_balance": opening_balance,
            "closing_balance": closing_balance,
            "currency": "INR",
            "transactions": transaction_list,
            "transaction_count": len(transaction_list),
            "generated_at": cls._now_utc().strftime("%Y-%m-%d %H:%M:%S UTC"),
        }

    @classmethod
    def export_csv(cls, statement_data: Dict) -> Tuple[bytes, str, str]:
        """Export statement as CSV with proper bank statement format."""
        output = io.StringIO()
        
        # Bank Header
        output.write("HYBRID PQ BANKING - POST QUANTUM SECURE\n")
        output.write("ACCOUNT STATEMENT\n")
        output.write("=" * 80 + "\n")
        output.write("\n")
        
        # Account Information Section
        output.write("ACCOUNT INFORMATION\n")
        output.write(f"Account Holder Name,{statement_data['account_holder']}\n")
        output.write(f"Account Number,{statement_data['account_number_masked']}\n")
        output.write(f"Account Type,{statement_data.get('account_type', 'SAVINGS')}\n")
        output.write(f"Account Status,{statement_data.get('account_status', 'ACTIVE')}\n")
        output.write(f"Branch Code,{statement_data.get('branch_code', 'MUM-HQ')}\n")
        output.write(f"Statement Period,{statement_data['statement_period']['start_date']} to {statement_data['statement_period']['end_date']}\n")
        output.write(f"Statement Generated On,{statement_data['generated_at']}\n")
        output.write("\n")
        
        # Balance Summary Section
        output.write("BALANCE SUMMARY\n")
        output.write(f"Opening Balance,{statement_data['currency']} {statement_data['opening_balance']:,.2f}\n")
        output.write(f"Closing Balance,{statement_data['currency']} {statement_data['closing_balance']:,.2f}\n")
        output.write(f"Total Transactions,{statement_data['transaction_count']}\n")
        output.write("\n")
        
        # Transaction Details Section
        output.write("TRANSACTION DETAILS\n")
        output.write("-" * 80 + "\n")
        
        # Transaction table headers
        fieldnames = [
            "Date",
            "Transaction ID",
            "From Account",
            "To Account",
            "Purpose",
            "Type",
            "Amount",
            "Status",
        ]
        
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        # Transaction rows
        for tx in statement_data["transactions"]:
            amount_str = f"{tx['amount']:,.2f}"
            if tx['direction'] == 'DEBIT':
                amount_str = f"-{amount_str}"
            else:
                amount_str = f"+{amount_str}"
            
            writer.writerow({
                "Date": tx["date"],
                "Transaction ID": tx["transaction_id"],
                "From Account": tx["from_account"],
                "To Account": tx["to_account"],
                "Purpose": tx["purpose"],
                "Type": tx["direction"],
                "Amount": amount_str,
                "Status": tx["status"],
            })
        
        output.write("\n")
        output.write("-" * 80 + "\n")
        output.write("\n")
        
        # Footer
        output.write("IMPORTANT NOTES:\n")
        output.write("- This is a computer-generated statement and does not require a signature.\n")
        output.write("- Please verify all transactions and report any discrepancies immediately.\n")
        output.write("- For queries, contact customer support or visit your nearest branch.\n")
        output.write("- Keep this statement secure and confidential.\n")
        output.write("\n")
        output.write("=" * 80 + "\n")
        output.write("Thank you for banking with Hybrid PQ Banking\n")
        output.write("Secured with Post-Quantum Cryptography\n")
        output.write("=" * 80 + "\n")
        
        csv_bytes = output.getvalue().encode("utf-8")
        filename = f"statement_{statement_data['statement_period']['start_date']}_{statement_data['statement_period']['end_date']}.csv"
        
        return csv_bytes, "text/csv", filename

    @staticmethod
    def _escape_pdf_text(value: str) -> str:
        """Escape special characters for PDF."""
        return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    @classmethod
    def export_pdf(cls, statement_data: Dict) -> Tuple[bytes, str, str]:
        """Export statement as PDF with proper bank statement format."""
        
        # Build comprehensive PDF content
        lines = []
        
        # Bank Header
        lines.extend([
            "=" * 90,
            "                    HYBRID PQ BANKING - POST QUANTUM SECURE",
            "                         ACCOUNT STATEMENT",
            "=" * 90,
            "",
        ])
        
        # Account Information Section
        lines.extend([
            "ACCOUNT INFORMATION",
            "-" * 90,
            f"Account Holder Name    : {statement_data['account_holder']}",
            f"Account Number         : {statement_data['account_number_masked']}",
            f"Account Type           : {statement_data.get('account_type', 'SAVINGS')}",
            f"Account Status         : {statement_data.get('account_status', 'ACTIVE')}",
            f"Branch Code            : {statement_data.get('branch_code', 'MUM-HQ')}",
            f"Statement Period       : {statement_data['statement_period']['start_date']} to {statement_data['statement_period']['end_date']}",
            f"Statement Generated On : {statement_data['generated_at']}",
            "",
        ])
        
        # Balance Summary Section
        lines.extend([
            "BALANCE SUMMARY",
            "-" * 90,
            f"Opening Balance        : {statement_data['currency']} {statement_data['opening_balance']:,.2f}",
            f"Closing Balance        : {statement_data['currency']} {statement_data['closing_balance']:,.2f}",
            f"Total Transactions     : {statement_data['transaction_count']}",
            "",
        ])
        
        # Transaction Details Section
        lines.extend([
            "TRANSACTION DETAILS",
            "-" * 90,
        ])
        
        if statement_data["transactions"]:
            # Table header
            lines.append(
                f"{'Date':<12} {'Type':<8} {'Purpose':<25} {'Amount':>15} {'Status':<10}"
            )
            lines.append("-" * 90)
            
            # Transaction rows (limit to 40 for PDF)
            for tx in statement_data["transactions"][:40]:
                date_str = tx['date'][:10]  # Just the date part
                direction = tx['direction'][:6]
                purpose = (tx['purpose'][:22] + '...') if len(tx['purpose']) > 25 else tx['purpose']
                amount_str = f"{tx['amount']:,.2f}"
                if tx['direction'] == 'DEBIT':
                    amount_str = f"-{amount_str}"
                else:
                    amount_str = f"+{amount_str}"
                status = tx['status'][:10]
                
                lines.append(
                    f"{date_str:<12} {direction:<8} {purpose:<25} {amount_str:>15} {status:<10}"
                )
            
            if len(statement_data["transactions"]) > 40:
                lines.append("")
                lines.append(f"... and {len(statement_data['transactions']) - 40} more transactions (download CSV for complete list)")
        else:
            lines.append("No transactions found in this period.")
        
        lines.extend([
            "",
            "-" * 90,
        ])
        
        # Footer
        lines.extend([
            "",
            "IMPORTANT NOTES:",
            "- This is a computer-generated statement and does not require a signature.",
            "- Please verify all transactions and report any discrepancies immediately.",
            "- For queries, contact customer support or visit your nearest branch.",
            "- Keep this statement secure and confidential.",
            "",
            "=" * 90,
            "                    Thank you for banking with Hybrid PQ Banking",
            "                         Secured with Post-Quantum Cryptography",
            "=" * 90,
        ])
        
        # Build PDF with proper structure
        text_commands = [
            "BT",
            "/F1 9 Tf",  # Font size 9
            "40 750 Td",  # Starting position
            "11 TL",  # Line height
        ]
        
        for line in lines:
            escaped_line = cls._escape_pdf_text(line)
            text_commands.append(f"({escaped_line}) Tj")
            text_commands.append("T*")  # Move to next line
        
        text_commands.append("ET")
        
        stream = "\n".join(text_commands).encode("utf-8")
        
        # Build PDF structure
        objects = []
        offsets = []

        def add_object(content: bytes) -> None:
            offsets.append(sum(len(obj) for obj in objects) + len(b"%PDF-1.4\n"))
            objects.append(content)

        # Catalog
        add_object(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
        
        # Pages
        add_object(b"2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n")
        
        # Page
        add_object(
            b"3 0 obj\n"
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n"
            b"endobj\n"
        )
        
        # Content stream
        content = (
            f"4 0 obj\n<< /Length {len(stream)} >>\nstream\n".encode("utf-8")
            + stream
            + b"\nendstream\nendobj\n"
        )
        add_object(content)
        
        # Font
        add_object(
            b"5 0 obj\n"
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\n"
            b"endobj\n"
        )
        
        # Build final PDF
        pdf_body = b"%PDF-1.4\n" + b"".join(objects)
        xref_start = len(pdf_body)
        
        # Cross-reference table
        xref_entries = [b"0000000000 65535 f \n"]
        for offset in offsets:
            xref_entries.append(f"{offset:010d} 00000 n \n".encode("ascii"))
        
        xref = b"xref\n0 6\n" + b"".join(xref_entries)
        
        # Trailer
        trailer = (
            b"trailer\n<< /Size 6 /Root 1 0 R >>\n"
            b"startxref\n"
            + str(xref_start).encode("ascii")
            + b"\n%%EOF\n"
        )
        
        pdf_bytes = pdf_body + xref + trailer
        
        filename = f"statement_{statement_data['statement_period']['start_date']}_{statement_data['statement_period']['end_date']}.pdf"
        
        return pdf_bytes, "application/pdf", filename
