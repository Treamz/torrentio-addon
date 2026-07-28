#!/bin/bash

# Torrentio Addon Deployment Script
set -e

echo "🚀 Deploying Torrentio Addon to VPS..."

# Configuration
VPS_USER=${VPS_USER:-root}
VPS_HOST=${VPS_HOST}
DEPLOY_DIR=${DEPLOY_DIR:-/opt/torrentio}

if [ -z "$VPS_HOST" ]; then
    echo "❌ Error: VPS_HOST environment variable is required"
    echo "Usage: VPS_HOST=your-server.com VPS_USER=root ./deploy.sh"
    exit 1
fi

echo "📦 Creating deployment archive..."
tar -czf torrentio-addon.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='torrentio-addon.tar.gz' \
    .

echo "📤 Uploading files to VPS..."
scp torrentio-addon.tar.gz ${VPS_USER}@${VPS_HOST}:/tmp/

echo "🔧 Setting up on VPS..."
ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
    # Create deployment directory
    sudo mkdir -p /opt/torrentio
    cd /opt/torrentio

    # Extract files
    sudo tar -xzf /tmp/torrentio-addon.tar.gz --strip-components=0
    sudo rm /tmp/torrentio-addon.tar.gz

    # Set permissions
    sudo chown -R $USER:$USER /opt/torrentio

    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
    fi

    # Install Docker Compose if not present
    if ! command -v docker compose &> /dev/null; then
        echo "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi

    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "Creating .env file from example..."
        cp .env.example .env
        echo "⚠️  Please edit /opt/torrentio/.env with your configuration"
    fi

    echo "🛑 Stopping existing services..."
    docker compose -f docker-compose.prod.yml down || true

    echo "🏗️  Building and starting services..."
    docker compose -f docker-compose.prod.yml up -d --build

    echo "✅ Deployment complete!"
    echo "📊 Service status:"
    docker compose -f docker-compose.prod.yml ps
EOF

echo "🧹 Cleaning up local files..."
rm torrentio-addon.tar.gz

echo ""
echo "🎉 Deployment completed successfully!"
echo "📝 Next steps:"
echo "1. SSH to your VPS: ssh ${VPS_USER}@${VPS_HOST}"
echo "2. Edit configuration: nano /opt/torrentio/.env"
echo "3. Restart services: cd /opt/torrentio && docker compose -f docker-compose.prod.yml restart"
echo "4. Check logs: docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🌐 Your Torrentio addon should be available at: http://${VPS_HOST}"