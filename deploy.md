# DocuMind Deployment Guide

## Architecture Overview

Your DocuMind application consists of:

1. **Frontend (Next.js 15)**: React app with Clerk authentication
2. **Backend (Node.js/Express)**: API server with file upload and chat endpoints
3. **Background Worker**: PDF processing with LangChain and embeddings
4. **Vector Database**: Qdrant for document embeddings storage
5. **Cache/Queue**: Redis (Valkey) for BullMQ job processing
6. **AI Service**: Google Gemini API for embeddings and chat

## Deployment Architecture Options

### Option 1: Cloud Platform Deployment (Recommended)

#### 1.1 Frontend Deployment (Vercel)

**Why Vercel**: Perfect for Next.js apps with built-in optimizations and edge functions.

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to client directory
cd client

# Deploy
vercel --prod
```

**Environment Variables for Vercel**:
```env
# Add these in Vercel Dashboard > Project Settings > Environment Variables
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/pdf-doc-chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/pdf-doc-chat
```

#### 1.2 Backend & Services Deployment (Railway/DigitalOcean/AWS)

**Option A: Railway (Easiest)**

1. **Create Railway Account**: Sign up at [railway.app](https://railway.app)

2. **Deploy Services**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Navigate to server directory
   cd server
   
   # Deploy
   railway up
   ```

3. **Add Environment Variables in Railway Dashboard**:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   QDRANT_URL=https://your-cluster-url.gcp.cloud.qdrant.io:6333
   QDRANT_API_KEY=your_qdrant_cloud_api_key
   REDIS_HOST=redis
   REDIS_PORT=6379
   NODE_ENV=production
   PORT=8000
   ```

4. **Create railway.json** in server directory:
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "nixpacks"
     },
     "deploy": {
       "startCommand": "node index.js",
       "healthcheckPath": "/",
       "healthcheckTimeout": 100,
       "restartPolicyType": "always"
     }
   }
   ```

5. **Add Services** (in Railway Dashboard):
   - **Redis**: Add Redis service from Railway marketplace
   - **Qdrant**: Deploy Qdrant using Docker template

**Option B: DigitalOcean App Platform**

1. **Create App** in DigitalOcean Control Panel
2. **Configure Services**:
   - **Web Service**: Point to your server code
   - **Database**: Add Redis database
   - **Container**: Add Qdrant container

3. **App Spec (YAML)**:
   ```yaml
   name: documind
   services:
   - name: api
     source_dir: /server
     github:
       repo: your-username/documind
       branch: main
     run_command: node index.js
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: GEMINI_API_KEY
       value: your_gemini_api_key
       type: SECRET
     - key: QDRANT_URL
       value: http://qdrant:6333
     - key: REDIS_HOST
       value: redis
     - key: REDIS_PORT
       value: 6379
     
   - name: worker
     source_dir: /server
     github:
       repo: your-username/documind
       branch: main
     run_command: node worker.js
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: GEMINI_API_KEY
       value: your_gemini_api_key
       type: SECRET
     - key: QDRANT_URL
       value: http://qdrant:6333
     - key: REDIS_HOST
       value: redis
     - key: REDIS_PORT
       value: 6379

   databases:
   - name: redis
     engine: REDIS
     
   static_sites:
   - name: frontend
     source_dir: /client
     github:
       repo: your-username/documind
       branch: main
     build_command: npm run build
     output_dir: .next
   ```

### Option 2: Self-Hosted VPS Deployment

#### 2.1 VPS Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker and Docker Compose
sudo apt install docker.io docker-compose -y
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Install PM2 for process management
sudo npm install pm2 -g

# Install Nginx for reverse proxy
sudo apt install nginx -y
```

#### 2.2 Application Setup

```bash
# Clone your repository
git clone https://github.com/your-username/documind.git
cd documind

# Setup server
cd server
npm install
cd ..

# Setup client
cd client
npm install
npm run build
cd ..
```

#### 2.3 Environment Configuration

**Create server/.env**:
```env
GEMINI_API_KEY=your_gemini_api_key
QDRANT_URL=http://localhost:6333
REDIS_HOST=localhost
REDIS_PORT=6379
NODE_ENV=production
PORT=8000
```

**Create client/.env.production**:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/pdf-doc-chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/pdf-doc-chat
```

#### 2.4 Start Services with Docker

**Create docker-compose.production.yml** in server directory:
```yaml
version: '3.8'

services:
  redis:
    image: valkey/valkey:7
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: valkey-server --appendonly yes

  qdrant:
    image: qdrant/qdrant:latest
    restart: always
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__LOG_LEVEL=INFO

volumes:
  redis_data:
  qdrant_data:
```

```bash
# Start infrastructure services
cd server
docker-compose -f docker-compose.production.yml up -d
```

#### 2.5 PM2 Process Management

**Create ecosystem.config.js** in project root:
```javascript
module.exports = {
  apps: [
    {
      name: 'documind-api',
      cwd: './server',
      script: 'index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      error_file: './logs/api-err.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'documind-worker',
      cwd: './server',
      script: 'worker.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/worker-err.log',
      out_file: './logs/worker-out.log',
      log_file: './logs/worker-combined.log',
      time: true
    },
    {
      name: 'documind-frontend',
      cwd: './client',
      script: 'npm',
      args: 'start',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};
```

```bash
# Create logs directory
mkdir logs

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

#### 2.6 Nginx Configuration

**Create /etc/nginx/sites-available/documind**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API routes
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Backend direct routes
    location ~ ^/(upload|chat) {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/documind /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 2.7 SSL Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Option 3: Docker Containerized Deployment

#### 3.1 Create Dockerfiles

**Create Dockerfile in server directory**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Start command will be overridden in docker-compose
CMD ["node", "index.js"]
```

**Create Dockerfile in client directory**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
```

#### 3.2 Docker Compose for Full Stack

**Create docker-compose.production.yml in project root**:
```yaml
version: '3.8'

services:
  # Infrastructure
  redis:
    image: valkey/valkey:7
    restart: always
    volumes:
      - redis_data:/data
    command: valkey-server --appendonly yes
    networks:
      - app-network

  qdrant:
    image: qdrant/qdrant:latest
    restart: always
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__LOG_LEVEL=INFO
    networks:
      - app-network

  # Backend API
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - QDRANT_URL=http://qdrant:6333
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./server/uploads:/app/uploads
    depends_on:
      - redis
      - qdrant
    networks:
      - app-network

  # Background Worker
  worker:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    command: node worker.js
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - QDRANT_URL=http://qdrant:6333
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    volumes:
      - ./server/uploads:/app/uploads
    depends_on:
      - redis
      - qdrant
    networks:
      - app-network
    deploy:
      replicas: 2

  # Frontend
  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
      - NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
      - NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/pdf-doc-chat
      - NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/pdf-doc-chat
    depends_on:
      - api
    networks:
      - app-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - api
    networks:
      - app-network

volumes:
  redis_data:
  qdrant_data:

networks:
  app-network:
    driver: bridge
```

#### 3.3 Environment Setup

**Create .env in project root**:
```env
# API Keys
GEMINI_API_KEY=your_gemini_api_key

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret
```

#### 3.4 Deploy with Docker

```bash
# Build and start all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Scale workers if needed
docker-compose -f docker-compose.production.yml up -d --scale worker=3
```

## Data Persistence & Backup

### 1. Database Backups

**Qdrant Backup**:
```bash
# Create backup script
cat > backup-qdrant.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/qdrant"
mkdir -p $BACKUP_DIR

# Create Qdrant snapshot
curl -X POST "http://localhost:6333/collections/snapshot" \
  -H "Content-Type: application/json"

# Copy snapshot files
docker exec qdrant_container_name tar czf - /qdrant/storage/snapshots | \
  cat > $BACKUP_DIR/qdrant_backup_$DATE.tar.gz

echo "Qdrant backup completed: $BACKUP_DIR/qdrant_backup_$DATE.tar.gz"
EOF

chmod +x backup-qdrant.sh
```

**Redis Backup**:
```bash
# Create Redis backup
cat > backup-redis.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/redis"
mkdir -p $BACKUP_DIR

# Create Redis dump
docker exec redis_container_name redis-cli BGSAVE
sleep 10
docker cp redis_container_name:/data/dump.rdb $BACKUP_DIR/redis_backup_$DATE.rdb

echo "Redis backup completed: $BACKUP_DIR/redis_backup_$DATE.rdb"
EOF

chmod +x backup-redis.sh
```

### 2. File Storage Backup

**Uploads Backup**:
```bash
# Create uploads backup
cat > backup-uploads.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/uploads"
mkdir -p $BACKUP_DIR

tar czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz ./server/uploads/

echo "Uploads backup completed: $BACKUP_DIR/uploads_backup_$DATE.tar.gz"
EOF

chmod +x backup-uploads.sh
```

### 3. Automated Backup Schedule

```bash
# Add to crontab for daily backups at 2 AM
crontab -e

# Add these lines:
0 2 * * * /path/to/backup-qdrant.sh
0 2 * * * /path/to/backup-redis.sh
0 2 * * * /path/to/backup-uploads.sh

# Weekly cleanup (keep only last 7 days)
0 3 * * 0 find /backups -name "*.tar.gz" -mtime +7 -delete
0 3 * * 0 find /backups -name "*.rdb" -mtime +7 -delete
```

## Monitoring & Maintenance

### 1. Health Checks

**Create health-check.sh**:
```bash
#!/bin/bash

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/)
echo "API Health: $API_HEALTH"

# Check Frontend health
FRONTEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
echo "Frontend Health: $FRONTEND_HEALTH"

# Check Qdrant health
QDRANT_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6333/)
echo "Qdrant Health: $QDRANT_HEALTH"

# Check Redis health
REDIS_HEALTH=$(docker exec redis_container_name redis-cli ping 2>/dev/null || echo "FAILED")
echo "Redis Health: $REDIS_HEALTH"

# Check disk space
echo "Disk Usage:"
df -h /
```

### 2. Log Management

**Setup Log Rotation**:
```bash
# Create /etc/logrotate.d/documind
sudo tee /etc/logrotate.d/documind << 'EOF'
/path/to/documind/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. Performance Monitoring

**Install monitoring tools**:
```bash
# Install htop for system monitoring
sudo apt install htop

# Install netdata for comprehensive monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

## Security Considerations

### 1. Environment Variables Security

- Never commit `.env` files to version control
- Use proper secret management in production (AWS Secrets Manager, HashiCorp Vault)
- Rotate API keys regularly

### 2. Network Security

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 6333   # Block direct Qdrant access
sudo ufw deny 6379   # Block direct Redis access
```

### 3. File Upload Security

Update your server configuration:
```javascript
// Add to server/index.js
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});
```

## Scaling Considerations

### 1. Horizontal Scaling

- **Frontend**: Use Vercel's edge functions or multiple Next.js instances behind a load balancer
- **Backend**: Scale API instances with PM2 cluster mode or Docker replicas
- **Workers**: Increase worker replicas based on processing load
- **Database**: Consider Qdrant clustering for large datasets

### 2. Vertical Scaling

- **Memory**: Increase for PDF processing and embeddings generation
- **CPU**: More cores for parallel document processing
- **Storage**: SSD for faster file I/O and database operations

### 3. CDN & Caching

```javascript
// Add caching to API responses
app.use('/api', (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  }
  next();
});
```

## Troubleshooting

### Common Issues

1. **Qdrant Connection Issues**:
   ```bash
   # Check Qdrant logs
   docker logs qdrant_container_name
   
   # Test connection
   curl http://localhost:6333/collections
   ```

2. **Redis Connection Issues**:
   ```bash
   # Check Redis logs
   docker logs redis_container_name
   
   # Test connection
   redis-cli ping
   ```

3. **PDF Processing Failures**:
   ```bash
   # Check worker logs
   pm2 logs documind-worker
   
   # Restart workers
   pm2 restart documind-worker
   ```

4. **Memory Issues**:
   ```bash
   # Monitor memory usage
   htop
   
   # Check Node.js memory usage
   pm2 monit
   ```

### Support

For additional support:
1. Check application logs: `pm2 logs`
2. Monitor system resources: `htop`
3. Check service status: `pm2 status`
4. Review error logs in `/var/log/nginx/error.log`

## Quick Deploy Checklist

### Before Deployment
- [ ] Set up Google Gemini API key
- [ ] Configure Clerk authentication
- [ ] Prepare domain name and DNS
- [ ] Choose deployment platform

### During Deployment
- [ ] Deploy infrastructure (Redis, Qdrant)
- [ ] Deploy backend services (API, Worker)
- [ ] Deploy frontend
- [ ] Configure reverse proxy/load balancer
- [ ] Set up SSL certificates
- [ ] Configure environment variables

### After Deployment
- [ ] Test file upload functionality
- [ ] Test chat functionality
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up log rotation
- [ ] Test scaling procedures

This guide provides multiple deployment options from simple cloud platforms to complex self-hosted setups. Choose the option that best fits your requirements and technical expertise.
