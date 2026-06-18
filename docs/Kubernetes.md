# FameHub Kubernetes Deployment Reference

This guide explains how to apply the provided Kubernetes manifests locally using `minikube` or in a production Kubernetes cluster.

## Deployment Manifests
The directory `kubernetes/` contains the following manifests:
- `namespace.yaml`: Creates isolated `famehub` namespace.
- `pv-pvc.yaml`: Configures storage volumes for PostgreSQL data and uploads.
- `configmap-secrets.yaml`: Configures environment variables and secret JWT/BBB keys.
- `infrastructure.yaml`: Runs Zookeeper, Kafka, Redis, and PostgreSQL containers.
- `backend.yaml`: Deploys the main Node.js Express backend with 3 replicas, liveness/readiness probes, and an HPA scaling up to 10 instances.
- `frontend.yaml`: Deploys the Nginx frontend static web application.
- `ingress.yaml`: Routes external HTTP/HTTPS traffic to the correct backend and frontend endpoints.

## Local Minikube Instructions

1. Start minikube with ingress enabled:
   ```bash
   minikube start
   minikube addons enable ingress
   ```

2. Point your local terminal to minikube's Docker daemon so it can locate built images:
   ```bash
   eval $(minikube docker-env)
   ```

3. Build the backend and frontend images:
   ```bash
   # Build frontend
   docker build -t famehub-frontend:latest -f Dockerfile .
   # Build backend
   docker build -t famehub-backend:latest -f backend/Dockerfile ./backend
   ```

4. Create directory structure for host volumes on minikube:
   ```bash
   minikube ssh "sudo mkdir -p /mnt/data/postgres /mnt/data/uploads && sudo chmod -R 777 /mnt/data/"
   ```

5. Deploy all Kubernetes manifests in order:
   ```bash
   kubectl apply -f kubernetes/namespace.yaml
   kubectl apply -f kubernetes/pv-pvc.yaml
   kubectl apply -f kubernetes/configmap-secrets.yaml
   kubectl apply -f kubernetes/infrastructure.yaml
   kubectl apply -f kubernetes/backend.yaml
   kubectl apply -f kubernetes/frontend.yaml
   kubectl apply -f kubernetes/ingress.yaml
   ```

6. Add the minikube IP to your hosts file:
   ```bash
   minikube ip
   # Add "<minikube_ip> famehub.edu" to /etc/hosts (or C:\Windows\System32\drivers\etc\hosts on Windows)
   ```

7. Access the application in your browser at `https://famehub.edu`.
