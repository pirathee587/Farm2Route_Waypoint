# Singapore development estimate

Estimate date: 2026-10-13. USD, 730 hours/month, Linux On-Demand, no discounts/tax/free-tier
assumptions. Rates for EC2, NAT, gp3 and ALB were retrieved from the AWS Pricing API during
Phase B. Recheck the official calculator before provisioning. These are estimated future
charges, not current billing or charges incurred by writing these files.

| Resource | Count / assumption | Unit rate | Monthly USD |
|---|---:|---:|---:|
| EKS standard-support control plane | 1 | $0.10/hour | 73.00 |
| EKS t3.medium nodes | 2 | $0.0528/hour each | 77.09 |
| Node gp3 roots | 60 GiB | $0.096/GiB-month | 5.76 |
| RabbitMQ gp3 | 10 GiB | $0.096/GiB-month | 0.96 |
| Upload gp3 | 10 GiB | $0.096/GiB-month | 0.96 |
| Zonal NAT gateway | 1 | $0.059/hour | 43.07 |
| NAT public IPv4 | 1 | $0.005/hour | 3.65 |
| ALB base | 1 | $0.0252/hour | 18.40 |
| ALB capacity | Average 1 LCU | $0.008/LCU-hour | 5.84 |
| ALB public IPv4 | Assume 2 | $0.005/address-hour | 7.30 |
| **Application platform subtotal** | | | **236.02** |
| Separate Jenkins t3.medium | Optional budget; not provisioned here | $0.0528/hour | 38.54 |
| Separate Jenkins gp3 | Assumed 30 GiB | $0.096/GiB-month | 2.88 |
| **Platform + always-on Jenkins** | | | **277.45** |

Rounded totals use unrounded individual calculations. IAM, security groups, routes, IGW,
VPC/subnets and the S3 gateway endpoint have no separate hourly line item in this estimate.
The state bucket incurs S3 storage/version/request charges. Six empty ECR repositories do
not imply six fixed fees; stored image layers, scanning choice and transfer drive charges.
No app S3 bucket or Secrets Manager resources are configured. Kubernetes Secrets have no
separate managed-secret subscription line item.

Additional variable charges excluded from subtotal:
- NAT processing: $0.059/GB; 100 GB adds $5.90, before any applicable transfer charges.
- Cross-AZ traffic: development private-B egress traverses NAT A; quantify actual paths.
- Internet egress, ECR image storage/transfer, CloudWatch ingestion and 14-day retention,
  state S3 versions/requests, snapshot storage, DNS hosted zone/queries and domains.
- T3 surplus CPU credits if sustained utilization exceeds burst baseline.
- Supabase, Vercel, Mapbox and optional security/monitoring services.
- Retained/orphaned EBS volumes after PVC removal remain billable.

Allow **$300–350/month** for light development with Jenkins, but this is a planning allowance,
not a cap. Configure a separately approved budget alert and measure traffic/log volume.
EKS extended support is $0.60/hour ($438/month), so version maintenance is material.

## One NAT vs one per AZ

Development `nat_per_az=false`: one NAT and one IPv4, $46.72/month before processing.
Both private subnets depend on AZ A egress; this is not resilient to loss of that NAT/AZ.
Production `nat_per_az=true`: two NATs and two IPv4s, $93.44/month before processing.
Increment: **$46.72/month**, bringing the illustrative platform + Jenkins subtotal to
**$324.17/month**, excluding all variable charges. Same-AZ routing reduces cross-AZ paths.
This switch alone does not make applications production HA; add replicas, broker/storage
resilience, spare node capacity, backups and load testing with separate cost review.

Existing unrelated 8-GiB and 50-GiB gp3 disks are excluded; at the same rate their storage
alone is about $5.57/month while retained. Do not delete them to reduce this project's cost.

Sources:
- https://aws.amazon.com/eks/pricing/
- https://aws.amazon.com/ec2/pricing/on-demand/
- https://aws.amazon.com/ebs/pricing/
- https://aws.amazon.com/vpc/pricing/
- https://aws.amazon.com/elasticloadbalancing/pricing/
- https://aws.amazon.com/ecr/pricing/
- https://aws.amazon.com/s3/pricing/
- https://aws.amazon.com/cloudwatch/pricing/
