# 📦 설치 가이드

이 문서는 Remote Debug Tools의 상세 설치 방법을 안내합니다.

## 목차

- [요구사항](#요구사항)
- [로컬 개발 환경 설정](#로컬-개발-환경-설정)
- [프로덕션 배포](#프로덕션-배포)
- [Docker 배포](#docker-배포)
- [클라우드 배포](#클라우드-배포)

---

## 요구사항

### 필수 소프트웨어

| 소프트웨어 | 최소 버전 | 권장 버전 | 설명 |
|-----------|----------|----------|------|
| Node.js | 20.0.0 | 22.x | JavaScript 런타임 |
| pnpm | 9.0.0 | 9.x | 패키지 매니저 |
| Docker | 20.0.0 | 최신 | 컨테이너 런타임 |
| Docker Compose | 2.0.0 | 최신 | 컨테이너 오케스트레이션 |

### 선택적 요구사항

| 소프트웨어 | 용도 |
|-----------|------|
| PostgreSQL 15+ | Docker 없이 로컬 DB 사용 시 |
| AWS CLI | S3 백업 기능 사용 시 |

### 시스템 요구사항

| 환경 | CPU | RAM | 디스크 |
|------|-----|-----|-------|
| 개발 | 2코어+ | 4GB+ | 10GB+ |
| 프로덕션 | 4코어+ | 8GB+ | 50GB+ |

---

## 로컬 개발 환경 설정

### 1. Node.js 설치

#### macOS (Homebrew)

```bash
# Node.js 설치
brew install node@22

# 또는 nvm 사용
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
```

#### Windows (winget)

```powershell
winget install OpenJS.NodeJS.LTS
```

#### Linux (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. pnpm 설치

```bash
# npm을 통한 설치
npm install -g pnpm

# 또는 corepack 사용 (Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

### 3. Docker Desktop 설치

- **macOS/Windows**: [Docker Desktop 다운로드](https://www.docker.com/products/docker-desktop)
- **Linux**: [Docker Engine 설치 가이드](https://docs.docker.com/engine/install/)

### 4. 프로젝트 클론

```bash
git clone https://github.com/your-username/remote-debug-tools.git
cd remote-debug-tools
```

### 5. 의존성 설치

```bash
# 모든 워크스페이스 의존성 설치
pnpm install
```

설치 과정에서 다음 항목들이 설치됩니다:
- 루트 프로젝트 의존성
- apps/remote-platform-external 의존성
- apps/remote-platform-internal 의존성
- sdk 의존성
- client 의존성
- figma-plugin 의존성

### 6. 환경변수 설정

```bash
# 템플릿 파일 복사
cp .env.example apps/remote-platform-external/src/.env.local
cp .env.example apps/remote-platform-internal/src/.env.local
```

기본 설정으로 로컬 개발이 가능합니다. 필요한 경우 `.env.local` 파일을 수정하세요.

### 7. 서비스 시작

```bash
# Docker Compose로 모든 서비스 시작
pnpm compose
```

또는 개별 서비스 시작:

```bash
# 터미널 1: 데이터베이스
docker-compose up postgres

# 터미널 2: External 서버
pnpm start:external:dev

# 터미널 3: Internal 서버
pnpm start:internal:dev

# 터미널 4: 클라이언트 (선택)
cd client && pnpm dev
```

### 8. 설치 확인

```bash
# 서비스 상태 확인
curl http://localhost:3000/health
curl http://localhost:3001/health

# 데이터베이스 연결 확인
docker-compose exec postgres pg_isready
```

---

## 프로덕션 배포

### 서버 빌드

```bash
# 모든 서버 빌드
pnpm build:internal
pnpm build:external

# SDK 빌드
cd sdk && pnpm build
```

### PM2를 통한 실행

```bash
# PM2 설치
npm install -g pm2

# 서비스 시작
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs
```

### Nginx 리버스 프록시 설정

```nginx
# /etc/nginx/sites-available/remote-debug-tools

upstream internal_server {
    server 127.0.0.1:3000;
}

upstream external_server {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name debug.example.com;

    # Internal 서버 (DevTools UI)
    location / {
        proxy_pass http://internal_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.debug.example.com;

    # External 서버 (SDK & API)
    location / {
        proxy_pass http://external_server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Docker 배포

### 단일 이미지 빌드

```bash
# 이미지 빌드
docker build -t remote-debug-tools:latest .

# 컨테이너 실행
docker run -d \
  --name remote-debug-tools \
  -p 3000:3000 \
  -p 3001:3001 \
  -e DB_HOST=your-db-host \
  -e DB_PORT=5432 \
  -e DB_USERNAME=your-user \
  -e DB_PASSWORD=your-password \
  -e DB_DATABASE=your-db \
  remote-debug-tools:latest
```

### Docker Compose (프로덕션)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=${DB_DATABASE}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USERNAME}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_DATABASE}
    restart: unless-stopped

volumes:
  postgres_data:
```

```bash
# 프로덕션 환경 실행
docker-compose -f docker-compose.prod.yml up -d
```

---

## 클라우드 배포

### AWS ECS 배포

1. **ECR에 이미지 푸시**

```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com

# 이미지 태그
docker tag remote-debug-tools:latest YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com/remote-debug-tools:latest

# 이미지 푸시
docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com/remote-debug-tools:latest
```

2. **ECS 태스크 정의 생성**

```json
{
  "family": "remote-debug-tools",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-2.amazonaws.com/remote-debug-tools:latest",
      "portMappings": [
        {"containerPort": 3000, "protocol": "tcp"},
        {"containerPort": 3001, "protocol": "tcp"}
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:..."}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/remote-debug-tools",
          "awslogs-region": "ap-northeast-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048"
}
```

### Kubernetes 배포

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: remote-debug-tools
spec:
  replicas: 2
  selector:
    matchLabels:
      app: remote-debug-tools
  template:
    metadata:
      labels:
        app: remote-debug-tools
    spec:
      containers:
        - name: app
          image: your-registry/remote-debug-tools:latest
          ports:
            - containerPort: 3000
            - containerPort: 3001
          env:
            - name: NODE_ENV
              value: "production"
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: host
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: remote-debug-tools
spec:
  selector:
    app: remote-debug-tools
  ports:
    - name: internal
      port: 3000
      targetPort: 3000
    - name: external
      port: 3001
      targetPort: 3001
  type: LoadBalancer
```

```bash
# Kubernetes 배포
kubectl apply -f k8s/
```

---

## 설치 후 확인사항

### 헬스 체크

```bash
# Internal 서버
curl -f http://localhost:3000/health

# External 서버
curl -f http://localhost:3001/health
```

### SDK 로드 테스트

```html
<script src="http://localhost:3001/sdk/index.umd.js"></script>
<script>
  console.log('SDK loaded:', !!window.RemoteDebugSdk);
</script>
```

### 데이터베이스 연결 확인

PgAdmin(http://localhost:5050)에 접속하여 테이블이 생성되었는지 확인합니다.

---

## 문제 해결

설치 중 문제가 발생하면 [문제 해결 가이드](./TROUBLESHOOTING.md)를 참조하세요.
