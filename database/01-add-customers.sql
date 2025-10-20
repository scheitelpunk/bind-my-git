-- Add customers table and link to projects
-- Migration script

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add customer_id column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);

-- Add updated_at trigger for customers table
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE customers IS 'Customer information for project tracking';
COMMENT ON COLUMN customers.id IS 'Unique identifier for the customer';
COMMENT ON COLUMN customers.customer_name IS 'Name of the customer';
COMMENT ON COLUMN projects.customer_id IS 'Reference to the customer associated with this project';
