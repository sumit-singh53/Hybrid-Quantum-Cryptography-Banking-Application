from flask import Flask
from app.config.config import Config
from app.config.database import db
from app.models.customer_model import Customer
from app.models.user_model import User
from app.models.certificate_model import Certificate
from app.models.transaction_model import Transaction
from app.models.audit_log_model import AuditLog
from app.models.role_model import Role
from datetime import datetime, timedelta

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    customers = Customer.query.all()
    print(f'Found {len(customers)} customers:')
    for c in customers:
        print(f'  - {c.name} (UUID: {c.id})')
    
    users = User.query.all()
    print(f'\nFound {len(users)} users:')
    for u in users:
        print(f'  - {u.username} / {u.full_name} (ID: {u.id}, Email: {u.email})')
    
    print('\nExisting certificates:')
    certs = Certificate.query.all()
    for cert in certs:
        print(f'  - UUID {cert.certificate_id} -> User {cert.user_id}')
    
    print('\nCreating missing certificate records...')
    created = 0
    for customer in customers:
        existing = Certificate.query.filter_by(certificate_id=customer.id).first()
        if existing:
            print(f'  Certificate already exists for {customer.name}')
            continue
        
        user = User.query.filter_by(full_name=customer.name).first()
        if user:
            cert = Certificate(
                certificate_id=customer.id,
                user_id=user.id,
                issued_by='CA',
                algorithm='RSA+Dilithium',
                valid_from=datetime.utcnow(),
                valid_to=datetime.utcnow() + timedelta(days=365),
                is_revoked=False
            )
            db.session.add(cert)
            created += 1
            print(f'  Created: {customer.name} (UUID {customer.id}) -> User {user.username} (ID {user.id})')
        else:
            print(f'  WARNING: No user found for customer {customer.name}')
    
    db.session.commit()
    print(f'\nCreated {created} new certificate records.')
