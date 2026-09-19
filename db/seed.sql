INSERT INTO accounts (id, owner_name, balance, currency) VALUES 
('d9b2d63d-a233-4123-8478-1234567890ab', 'Alice Smith', 5000.00, 'USD'),
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Bob Johnson', 1500.00, 'USD')
ON CONFLICT DO NOTHING;