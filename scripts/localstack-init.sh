#!/bin/bash

echo "Initializing LocalStack resources..."

# Create S3 bucket for receipts
awslocal s3 mb s3://expense-receipts

# Set bucket CORS configuration
awslocal s3api put-bucket-cors --bucket expense-receipts --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'

echo "LocalStack initialization complete!"
