# FameHub AWS Enterprise Deployment Guide

This guide describes how to transition from local Docker Compose files to a fully managed, scalable AWS deployment architecture.

## AWS Targeted Architecture

```
                                  +-------------------+
                                  |     Route 53      |
                                  +---------+---------+
                                            |
                                            v
                                  +---------+---------+
                                  |    CloudFront     |
                                  +---------+---------+
                                            |
                                            v
                               +------------+------------+
                               | Application Load Balancer|
                               +------------+------------+
                                            |
                                 +----------+----------+
                                 |  Elastic Kubernetes |
                                 |    Service (EKS)    |
                                 +----+------+------+--+
                                      |      |      |
                    +-----------------+      |      +-----------------+
                    v                        v                        v
            +-------+-------+        +-------+-------+        +-------+-------+
            |  RDS Postgres |        |ElastiCache    |        |Amazon MSK     |
            |   Database    |        |  (Redis)      |        |   (Kafka)     |
            +---------------+        +---------------+        +---------------+
```

## Step-by-Step Implementation

### 1. Managed Databases
Replace PostgreSQL and Redis containers with AWS managed equivalents:
- **Database (Amazon RDS for PostgreSQL)**: Spin up a multi-AZ DB instance. Update `DATABASE_URL` connection strings to point to the RDS endpoint.
- **Cache (Amazon ElastiCache for Redis)**: Provision a Redis replication group. Enable transit encryption and update `REDIS_URL`.

### 2. Event Streaming (Amazon MSK)
Replace self-hosted Zookeeper & Kafka StatefulSets with **Amazon Managed Streaming for Apache Kafka (MSK)**:
- Create an MSK cluster inside your private subnets.
- Obtain the bootstrap broker endpoint URLs and update the `KAFKA_BROKERS` variable in EKS config maps.

### 3. File Storage (Amazon S3)
For durable file uploads, change your backend file controller configuration to store files directly in **Amazon S3**:
- Create a private S3 bucket.
- Set up an IAM Instance Role or Kubernetes ServiceAccount (IRSA) allowing EKS pods to perform `s3:PutObject` and `s3:GetObject` calls.

### 4. Container Orchestration (Amazon EKS)
Use the files inside `kubernetes/` but swap parameters:
- Create an EKS cluster using `eksctl` or Terraform.
- Configure AWS Load Balancer Controller to automatically deploy an **Application Load Balancer (ALB)** upon applying `ingress.yaml`.
- Secure traffic with SSL certificates managed by **AWS Certificate Manager (ACM)**.
