#!/bin/bash

echo "🚀 Production Setup Script"
echo "=========================="

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your domain name"
    echo "Usage: ./setup-production.sh your-domain.com your-email@example.com"
    exit 1
fi

if [ -z "$2" ]; then
    echo "❌ Please provide your email address"
    echo "Usage: ./setup-production.sh your-domain.com your-email@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo "🌐 Setting up for domain: $DOMAIN"
echo "📧 Using email: $EMAIL"

# Update nginx configuration
echo "⚙️  Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf

# Update docker-compose with domain
sed -i "s/your-domain.com/$DOMAIN/g" docker-compose.yml

# Update setup-ssl.sh
sed -i "s/your-domain.com/$DOMAIN/g" setup-ssl.sh
sed -i "s/your-email@example.com/$EMAIL/g" setup-ssl.sh

# Make scripts executable
chmod +x setup-ssl.sh

echo "✅ Configuration updated!"
echo ""
echo "📝 Next steps:"
echo "1. Point your domain DNS to this server's IP address"
echo "2. Run: ./setup-ssl.sh to generate SSL certificates"
echo "3. Update backend/.env with new URLs:"
echo "   FRONTEND_URL=https://$DOMAIN"
echo "   BACKEND_URL=https://$DOMAIN/api"
echo "   ALLOW_ORIGINS=https://$DOMAIN"
echo ""
echo "🔧 For development, you can still use: node start-dev.js"