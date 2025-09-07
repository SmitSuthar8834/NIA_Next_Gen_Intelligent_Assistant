#!/bin/bash

# SSL Setup Script for your application
# Replace 'your-domain.com' with your actual domain

DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

echo "🔐 Setting up SSL certificates for $DOMAIN"

# Create directories for Certbot
mkdir -p certbot/conf
mkdir -p certbot/www

# Stop any running containers
echo "📦 Stopping existing containers..."
docker-compose down

# Start nginx without SSL first (for initial certificate generation)
echo "🚀 Starting nginx for certificate generation..."
docker-compose up -d nginx

# Wait for nginx to be ready
sleep 10

# Generate initial certificate
echo "📜 Generating SSL certificate..."
docker-compose run --rm certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Update nginx configuration with your domain
echo "⚙️  Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf

# Restart all services with SSL
echo "🔄 Restarting services with SSL..."
docker-compose down
docker-compose up -d

echo "✅ SSL setup complete!"
echo "🌐 Your application should now be available at https://$DOMAIN"
echo ""
echo "📝 Next steps:"
echo "1. Update your DNS to point $DOMAIN to this server's IP"
echo "2. Update backend/.env with the new domain URLs"
echo "3. Test the application from multiple devices"