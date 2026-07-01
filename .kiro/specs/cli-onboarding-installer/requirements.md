# Requirements Document: CIG CLI Onboarding & Installer

## Introduction

The CIG CLI Onboarding & Installer transforms the existing scaffolded CLI into a production-grade bootstrap, authentication, enrollment, and installation system. The CLI serves as the primary entrypoint for users to install, configure, and connect CIG instances to their infrastructure, supporting both managed cloud-connected deployments and self-hosted local installations.

This specification addresses the current reality: the CLI package exists with command stubs, credential management, and a basic wizard, but lacks authentication flows, enrollment systems, and actual installation logic. The goal is to build a secure, user-friendly installer that handles device authorization, target machine enrollment, Docker-based service deployment, and dashboard integration.

## Current Reality

The existing CLI implementation (packages/cli) includes:
- Commander.js framework with 8 command stubs (install, connect aws/gcp, deploy, start, stop, status, seed, reset)
- Wizard that collects deployment target, credentials, and port configuration
- CredentialManager with AES-256-GCM encryption for AWS/GCP credentials
- Docker detection and OS platform detection utilities
- TODO stubs for provision() and rollback() functions
- No authentication, enrollment, or installation implementation

The broader CIG system is 75% complete with working API (Fastify + JWT auth), dashboard (Next.js), graph engine (Neo4j), discovery services (Cartography), and Docker Compose infrastructure for 7 services.

## Glossary

- **CLI**: Command-line interface tool (cig command) that users install on their local or target machines
- **Target_Machine**: The physical or virtual machine where CIG services will be installed and run
- **CIG_Account**: User account in the managed CIG cloud service for authentication and target management
- **Device_Authorization**: OAuth 2.0 device authorization grant flow for CLI authentication without browser redirect
- **Enrollment**: Process of registering a Target_Machine with a CIG_Account to enable remote management
- **Enrollment_Token**: Short-lived cryptographic token used to complete Target_Machine enrollment
- **Bootstrap_Token**: One-time secret used to initialize local self-hosted CIG instance admin access
- **Install_Profile**: Predefined service configuration (core or full) determining which CIG services to deploy
- **Managed_Mode**: Operational mode where Target_Machine connects to CIG cloud service for authentication and management
- **Self_Hosted_Mode**: Operational mode where CIG runs entirely locally without cloud service dependency
- **Target_Identity**: Persistent cryptographic identity assigned to enrolled Target_Machine
- **Install_Manifest**: Configuration bundle containing service definitions, secrets, and deployment parameters
- **Dashboard**: Next.js web application providing UI for CIG management and visualization
- **API**: Fastify-based REST/GraphQL/WebSocket server providing CIG backend services
- **Compose_Stack**: Docker Compose configuration defining CIG service containers and dependencies


## Requirements

### Requirement 1: Device Authorization Flow

**User Story:** As a CIG user, I want to authenticate my CLI using a device code flow, so that I can securely connect my Target_Machine to my CIG_Account without exposing credentials in the terminal.

#### Acceptance Criteria

1. WHEN a user executes `cig login`, THE CLI SHALL initiate a device authorization request with the API
2. WHEN the device authorization request succeeds, THE CLI SHALL display a short alphanumeric verification code (6-8 characters)
3. WHEN the device authorization request succeeds, THE CLI SHALL display a verification URL where the user can approve the device
4. WHEN the device authorization request succeeds, THE CLI SHALL display an optional QR code URL for mobile approval
5. WHEN the CLI displays the verification information, THE CLI SHALL begin polling the API for authorization approval
6. THE CLI SHALL poll the API at 5-second intervals with exponential backoff up to 15 seconds
7. WHEN the user approves the device code in the Dashboard, THE API SHALL return access and refresh tokens to the CLI
8. WHEN the CLI receives tokens, THE CLI SHALL store them securely using the CredentialManager
9. WHEN the device code expires (15 minutes), THE CLI SHALL display an error and prompt the user to retry
10. WHEN the user denies the device code, THE CLI SHALL display an error and exit gracefully

### Requirement 2: Secure Credential Storage

**User Story:** As a CIG user, I want my authentication tokens stored securely on my machine, so that unauthorized users cannot access my CIG_Account.

#### Acceptance Criteria

1. THE CLI SHALL store access tokens, refresh tokens, and Target_Identity credentials using AES-256-GCM encryption
2. THE CLI SHALL derive encryption keys from machine-specific identifiers (hostname + username)
3. THE CLI SHALL store encrypted credentials in ~/.cig/auth.json with file permissions 0600
4. WHEN storing credentials, THE CLI SHALL include token expiration timestamps
5. WHEN loading credentials, THE CLI SHALL validate token expiration and refresh if necessary
6. THE CLI SHALL support token refresh using refresh tokens before access token expiration
7. WHEN a refresh token expires, THE CLI SHALL require the user to re-authenticate via `cig login`
8. THE CLI SHALL provide a `cig logout` command that deletes all stored credentials
9. WHEN credentials are corrupted or invalid, THE CLI SHALL prompt the user to re-authenticate

### Requirement 3: Target Machine Enrollment

**User Story:** As a CIG user, I want to enroll my Target_Machine with my CIG_Account, so that the Dashboard can recognize and manage my installation.

#### Acceptance Criteria

1. WHEN a user executes `cig install` in Managed_Mode after authentication, THE CLI SHALL request an Enrollment_Token from the API
2. THE Enrollment_Token SHALL be valid for 10 minutes and single-use only
3. WHEN the CLI receives an Enrollment_Token, THE CLI SHALL collect Target_Machine metadata (hostname, OS, architecture, IP address)
4. WHEN the CLI collects metadata, THE CLI SHALL send an enrollment request to the API with the Enrollment_Token and metadata
5. WHEN the API validates the enrollment request, THE API SHALL generate a Target_Identity (UUID + signing key pair)
6. WHEN the API generates a Target_Identity, THE API SHALL return the Target_Identity credentials to the CLI
7. THE CLI SHALL store the Target_Identity credentials securely using the CredentialManager
8. WHEN enrollment completes, THE Target_Machine SHALL appear in the Dashboard with status "enrolled"
9. WHEN enrollment fails due to token expiration, THE CLI SHALL request a new Enrollment_Token and retry
10. THE CLI SHALL support a `cig enroll` command to re-enroll a Target_Machine without reinstalling


### Requirement 4: Installation Prerequisite Validation

**User Story:** As a CIG user, I want the CLI to validate system prerequisites before installation, so that I can fix issues before deployment begins.

#### Acceptance Criteria

1. WHEN a user executes `cig install`, THE CLI SHALL check that Docker is installed and running
2. WHEN a user executes `cig install`, THE CLI SHALL check that Docker Compose is available (v2.0+)
3. WHEN a user executes `cig install`, THE CLI SHALL check available system memory (minimum 4GB)
4. WHEN a user executes `cig install`, THE CLI SHALL check available disk space (minimum 10GB)
5. WHEN a user executes `cig install`, THE CLI SHALL check that required ports are not in use (3000, 7474, 7687, 8000, 8080)
6. WHEN a prerequisite check fails, THE CLI SHALL display a clear error message with remediation steps
7. WHEN all prerequisite checks pass, THE CLI SHALL proceed to installation
8. THE CLI SHALL provide a `cig doctor` command that runs prerequisite checks without installing
9. WHEN `cig doctor` completes, THE CLI SHALL display a summary of system readiness

### Requirement 5: Install Profile Selection

**User Story:** As a CIG user, I want to choose between core and full installation profiles, so that I can deploy only the services I need.

#### Acceptance Criteria

1. THE CLI SHALL support a `--profile` flag with values "core" or "full" (default: core)
2. WHEN the user selects the "core" profile, THE CLI SHALL install API, Neo4j, Dashboard, Discovery, and Cartography services
3. WHEN the user selects the "full" profile, THE CLI SHALL install all core services plus Chatbot, Chroma, and Agents services
4. WHEN the user does not specify a profile, THE CLI SHALL prompt interactively for profile selection
5. THE CLI SHALL display the list of services included in each profile before installation
6. WHEN the user confirms the profile selection, THE CLI SHALL proceed with installation

### Requirement 6: Docker Compose Installation

**User Story:** As a CIG user, I want the CLI to deploy CIG services using Docker Compose, so that I can run CIG without manual container management.

#### Acceptance Criteria

1. WHEN installation begins, THE CLI SHALL generate a docker-compose.yml file based on the selected Install_Profile
2. WHEN generating the compose file, THE CLI SHALL include only services required by the Install_Profile
3. WHEN generating the compose file, THE CLI SHALL generate secure random passwords for Neo4j and other services
4. WHEN generating the compose file, THE CLI SHALL write secrets to a .env file with permissions 0600
5. THE CLI SHALL create a CIG installation directory at ~/.cig/install or user-specified path
6. WHEN the compose file is ready, THE CLI SHALL execute `docker compose up -d` to start services
7. WHEN starting services, THE CLI SHALL display real-time progress for each container
8. WHEN a service fails to start, THE CLI SHALL display the error and offer to rollback
9. WHEN all services start successfully, THE CLI SHALL wait for health checks to pass (max 5 minutes)
10. WHEN health checks pass, THE CLI SHALL mark the installation as "ready"


### Requirement 7: Self-Hosted Bootstrap

**User Story:** As a CIG user, I want to install CIG in Self_Hosted_Mode without a CIG_Account, so that I can run CIG entirely on my own infrastructure.

#### Acceptance Criteria

1. THE CLI SHALL support a `--mode self-hosted` flag for `cig install` command
2. WHEN installing in Self_Hosted_Mode, THE CLI SHALL skip authentication and enrollment steps
3. WHEN installing in Self_Hosted_Mode, THE CLI SHALL generate a Bootstrap_Token (32-character random string)
4. WHEN installation completes in Self_Hosted_Mode, THE CLI SHALL display the local Dashboard URL (http://localhost:3000)
5. WHEN installation completes in Self_Hosted_Mode, THE CLI SHALL display the Bootstrap_Token
6. THE Bootstrap_Token SHALL be valid for 30 minutes after first Dashboard access
7. WHEN a user accesses the Dashboard with a valid Bootstrap_Token, THE Dashboard SHALL prompt for admin account creation
8. WHEN the admin account is created, THE Bootstrap_Token SHALL be invalidated
9. WHEN the Bootstrap_Token expires, THE CLI SHALL provide a `cig bootstrap-reset` command to generate a new token
10. THE CLI SHALL store the Bootstrap_Token in ~/.cig/bootstrap.json with permissions 0600

### Requirement 8: Managed Mode Installation

**User Story:** As a CIG user, I want to install CIG in Managed_Mode connected to my CIG_Account, so that I can manage my Target_Machine from the Dashboard.

#### Acceptance Criteria

1. THE CLI SHALL default to Managed_Mode when `--mode` flag is not specified
2. WHEN installing in Managed_Mode, THE CLI SHALL require successful authentication via `cig login`
3. WHEN installing in Managed_Mode, THE CLI SHALL complete Target_Machine enrollment before deploying services
4. WHEN installing in Managed_Mode, THE CLI SHALL request an Install_Manifest from the API
5. THE Install_Manifest SHALL include service configurations, environment variables, and Target_Identity credentials
6. WHEN the CLI receives the Install_Manifest, THE CLI SHALL generate the docker-compose.yml and .env files
7. WHEN services start in Managed_Mode, THE CLI SHALL configure the API to connect to the CIG cloud service
8. WHEN installation completes in Managed_Mode, THE Target_Machine SHALL send a heartbeat to the API every 60 seconds
9. WHEN the Dashboard receives the first heartbeat, THE Target_Machine status SHALL change to "online"
10. WHEN installation completes in Managed_Mode, THE CLI SHALL display the Dashboard URL for the CIG_Account

### Requirement 9: Installation Rollback

**User Story:** As a CIG user, I want the CLI to rollback failed installations automatically, so that my system is not left in a broken state.

#### Acceptance Criteria

1. WHEN any installation step fails, THE CLI SHALL prompt the user to rollback or retry
2. WHEN the user chooses rollback, THE CLI SHALL stop all running CIG containers
3. WHEN rolling back, THE CLI SHALL remove all CIG containers and networks
4. WHEN rolling back, THE CLI SHALL preserve data volumes unless the user specifies `--purge-data`
5. WHEN rolling back, THE CLI SHALL delete generated configuration files (.env, docker-compose.yml)
6. WHEN rolling back in Managed_Mode, THE CLI SHALL notify the API that enrollment failed
7. WHEN rollback completes, THE CLI SHALL display a summary of cleaned resources
8. THE CLI SHALL provide a `cig uninstall` command for manual uninstallation
9. WHEN `cig uninstall` executes, THE CLI SHALL prompt for confirmation before removing services
10. WHEN `cig uninstall --purge-data` executes, THE CLI SHALL remove all data volumes and stored credentials


### Requirement 10: Target Status Monitoring

**User Story:** As a CIG user, I want to check the status of my CIG installation, so that I can verify services are running correctly.

#### Acceptance Criteria

1. THE CLI SHALL provide a `cig status` command that displays the state of all CIG services
2. WHEN `cig status` executes, THE CLI SHALL query Docker for container status (running, stopped, restarting, unhealthy)
3. WHEN `cig status` executes, THE CLI SHALL display service health check results
4. WHEN `cig status` executes in Managed_Mode, THE CLI SHALL display Target_Machine enrollment status
5. WHEN `cig status` executes in Managed_Mode, THE CLI SHALL display last successful heartbeat timestamp
6. WHEN `cig status` executes, THE CLI SHALL display Dashboard URL and accessibility status
7. WHEN any service is unhealthy, THE CLI SHALL display diagnostic information and suggested actions
8. THE CLI SHALL provide a `--json` flag for machine-readable status output
9. WHEN `cig status --json` executes, THE CLI SHALL output status in JSON format

### Requirement 11: Service Lifecycle Management

**User Story:** As a CIG user, I want to start, stop, and restart CIG services, so that I can manage my installation without Docker commands.

#### Acceptance Criteria

1. THE CLI SHALL provide a `cig start` command that starts all stopped CIG services
2. THE CLI SHALL provide a `cig stop` command that stops all running CIG services
3. THE CLI SHALL provide a `cig restart` command that restarts all CIG services
4. WHEN `cig start` executes, THE CLI SHALL execute `docker compose start` in the installation directory
5. WHEN `cig stop` executes, THE CLI SHALL execute `docker compose stop` in the installation directory
6. WHEN `cig restart` executes, THE CLI SHALL execute `docker compose restart` in the installation directory
7. WHEN lifecycle commands execute, THE CLI SHALL display real-time progress for each service
8. WHEN a lifecycle command fails, THE CLI SHALL display the error and exit with non-zero status
9. THE CLI SHALL support a `--service` flag to target specific services (e.g., `cig restart --service api`)

### Requirement 12: Dashboard Integration - Device Approval

**User Story:** As a CIG user, I want to approve CLI device authorization requests in the Dashboard, so that I can securely authorize my Target_Machine.

#### Acceptance Criteria

1. WHEN a CLI initiates device authorization, THE API SHALL create a pending device authorization record
2. WHEN a user logs into the Dashboard, THE Dashboard SHALL display pending device authorization requests
3. WHEN the Dashboard displays a device request, THE Dashboard SHALL show the verification code, requesting IP, and timestamp
4. WHEN the user approves a device request, THE Dashboard SHALL send an approval request to the API
5. WHEN the API receives approval, THE API SHALL generate access and refresh tokens for the CLI
6. WHEN the user denies a device request, THE Dashboard SHALL send a denial request to the API
7. WHEN the API receives denial, THE API SHALL mark the device authorization as denied
8. WHEN a device authorization expires (15 minutes), THE Dashboard SHALL automatically remove it from the pending list


### Requirement 13: Dashboard Integration - Target Management

**User Story:** As a CIG user, I want to view and manage my enrolled Target_Machines in the Dashboard, so that I can monitor my CIG installations.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a "Targets" page listing all enrolled Target_Machines for the CIG_Account
2. WHEN the Targets page loads, THE Dashboard SHALL display Target_Machine hostname, OS, status, and last heartbeat
3. WHEN a Target_Machine is online, THE Dashboard SHALL display a green status indicator
4. WHEN a Target_Machine has not sent a heartbeat for 5 minutes, THE Dashboard SHALL display a yellow "degraded" status
5. WHEN a Target_Machine has not sent a heartbeat for 15 minutes, THE Dashboard SHALL display a red "offline" status
6. WHEN the user clicks a Target_Machine, THE Dashboard SHALL display detailed information (IP, install profile, version, uptime)
7. THE Dashboard SHALL provide an "Open Dashboard" button that links to the Target_Machine's local Dashboard URL
8. THE Dashboard SHALL provide a "Revoke Access" button that invalidates the Target_Identity credentials
9. WHEN the user revokes access, THE API SHALL invalidate the Target_Identity and notify the Target_Machine
10. WHEN a Target_Machine receives revocation notification, THE CLI SHALL display a warning and require re-enrollment

### Requirement 14: Dashboard Integration - Self-Hosted Bootstrap

**User Story:** As a CIG user, I want to complete initial admin setup for my self-hosted CIG instance, so that I can access the Dashboard securely.

#### Acceptance Criteria

1. WHEN a user accesses a self-hosted Dashboard for the first time, THE Dashboard SHALL detect the absence of admin accounts
2. WHEN no admin accounts exist, THE Dashboard SHALL display a bootstrap page requesting the Bootstrap_Token
3. WHEN the user enters a valid Bootstrap_Token, THE Dashboard SHALL display an admin account creation form
4. THE admin account creation form SHALL require username, email, and password (minimum 12 characters)
5. WHEN the user submits the admin account form, THE Dashboard SHALL send a bootstrap completion request to the API
6. WHEN the API receives the bootstrap request, THE API SHALL validate the Bootstrap_Token
7. WHEN the Bootstrap_Token is valid, THE API SHALL create the admin account with full permissions
8. WHEN the admin account is created, THE API SHALL invalidate the Bootstrap_Token
9. WHEN bootstrap completes, THE Dashboard SHALL redirect the user to the login page
10. WHEN the Bootstrap_Token is invalid or expired, THE Dashboard SHALL display an error and instructions to run `cig bootstrap-reset`

### Requirement 15: Remote Target Installation via SSH

**User Story:** As a CIG user, I want to install CIG on a remote Linux host via SSH, so that I can deploy CIG without manual server access.

#### Acceptance Criteria

1. THE CLI SHALL support a `--remote` flag with SSH connection string (user@host:port)
2. WHEN `cig install --remote` executes, THE CLI SHALL establish an SSH connection to the remote host
3. WHEN the SSH connection succeeds, THE CLI SHALL verify the remote host has Docker installed
4. WHEN Docker is not installed on the remote host, THE CLI SHALL offer to install Docker automatically
5. WHEN the user approves Docker installation, THE CLI SHALL execute Docker installation script via SSH
6. WHEN the remote host is ready, THE CLI SHALL copy the CIG installation artifacts to the remote host
7. WHEN artifacts are copied, THE CLI SHALL execute the installation commands remotely via SSH
8. WHEN remote installation completes, THE CLI SHALL display the remote Dashboard URL
9. WHEN remote installation fails, THE CLI SHALL offer to rollback and clean the remote host
10. THE CLI SHALL support SSH key-based authentication and password authentication


### Requirement 16: Target Heartbeat and Connection Management

**User Story:** As a CIG operator, I want enrolled Target_Machines to maintain persistent connections to the CIG cloud service, so that I can monitor and manage them in real-time.

#### Acceptance Criteria

1. WHEN a Target_Machine is enrolled in Managed_Mode, THE installed API service SHALL send heartbeat messages to the CIG cloud API every 60 seconds
2. THE heartbeat message SHALL include Target_Identity credentials, service status, and system metrics (CPU, memory, disk)
3. WHEN the CIG cloud API receives a heartbeat, THE API SHALL update the Target_Machine's last_seen timestamp
4. WHEN the CIG cloud API receives a heartbeat, THE API SHALL validate the Target_Identity signature
5. WHEN the Target_Identity signature is invalid, THE API SHALL reject the heartbeat and mark the Target_Machine as "unauthorized"
6. WHEN a Target_Machine fails to send a heartbeat for 5 minutes, THE API SHALL mark the status as "degraded"
7. WHEN a Target_Machine fails to send a heartbeat for 15 minutes, THE API SHALL mark the status as "offline"
8. WHEN a Target_Machine reconnects after being offline, THE API SHALL mark the status as "online"
9. THE heartbeat connection SHALL use HTTPS with TLS 1.3 and certificate pinning
10. WHEN the heartbeat connection fails, THE Target_Machine SHALL retry with exponential backoff (5s, 10s, 20s, 40s, 60s max)

### Requirement 17: Installation State Persistence

**User Story:** As a CIG user, I want the CLI to remember my installation state, so that I can resume operations after system restarts.

#### Acceptance Criteria

1. THE CLI SHALL store installation state in ~/.cig/state.json with permissions 0600
2. THE installation state SHALL include installation directory, Install_Profile, mode (managed/self-hosted), and installation timestamp
3. WHEN the CLI executes any command, THE CLI SHALL load the installation state if it exists
4. WHEN installation state exists, THE CLI SHALL validate that the installation directory still exists
5. WHEN the installation directory is missing, THE CLI SHALL mark the installation as "corrupted" and prompt for reinstallation
6. WHEN `cig status` executes without installation state, THE CLI SHALL display "CIG is not installed"
7. WHEN `cig install` executes with existing installation state, THE CLI SHALL prompt the user to uninstall first or use `--force`
8. WHEN `cig install --force` executes, THE CLI SHALL uninstall the existing installation before proceeding

### Requirement 18: Upgrade Management

**User Story:** As a CIG user, I want to upgrade my CIG installation to newer versions, so that I can benefit from bug fixes and new features.

#### Acceptance Criteria

1. THE CLI SHALL provide a `cig upgrade` command that upgrades CIG services to the latest version
2. WHEN `cig upgrade` executes, THE CLI SHALL check the current installed version
3. WHEN `cig upgrade` executes, THE CLI SHALL query the API or GitHub releases for the latest version
4. WHEN a newer version is available, THE CLI SHALL display the changelog and prompt for confirmation
5. WHEN the user confirms upgrade, THE CLI SHALL pull new Docker images for all services
6. WHEN new images are pulled, THE CLI SHALL execute `docker compose up -d` to restart services with new versions
7. WHEN upgrade completes successfully, THE CLI SHALL update the installation state with the new version
8. WHEN upgrade fails, THE CLI SHALL rollback to the previous version automatically
9. THE CLI SHALL support a `--version` flag to upgrade to a specific version
10. WHEN `cig upgrade --check` executes, THE CLI SHALL display available updates without upgrading


### Requirement 19: API Device Authorization Endpoints

**User Story:** As a CIG API developer, I want to implement device authorization endpoints, so that the CLI can authenticate users securely.

#### Acceptance Criteria

1. THE API SHALL provide a POST /api/v1/auth/device/authorize endpoint that initiates device authorization
2. WHEN the authorize endpoint receives a request, THE API SHALL generate a device_code (32 characters) and user_code (6-8 characters)
3. WHEN the authorize endpoint generates codes, THE API SHALL store them with expiration timestamp (15 minutes)
4. THE authorize endpoint SHALL return device_code, user_code, verification_uri, and expires_in
5. THE API SHALL provide a POST /api/v1/auth/device/poll endpoint that checks authorization status
6. WHEN the poll endpoint receives a device_code, THE API SHALL check if the user has approved it
7. WHEN the device is not yet approved, THE poll endpoint SHALL return status "pending"
8. WHEN the device is approved, THE poll endpoint SHALL return access_token, refresh_token, and token_type
9. WHEN the device is denied, THE poll endpoint SHALL return status "denied"
10. WHEN the device_code is expired or invalid, THE poll endpoint SHALL return status "expired"
11. THE API SHALL provide a POST /api/v1/auth/device/approve endpoint for Dashboard approval
12. WHEN the approve endpoint receives a user_code and authenticated user session, THE API SHALL mark the device as approved
13. THE API SHALL rate-limit the poll endpoint to 1 request per 5 seconds per device_code

### Requirement 20: API Target Enrollment Endpoints

**User Story:** As a CIG API developer, I want to implement target enrollment endpoints, so that CLI can register Target_Machines with user accounts.

#### Acceptance Criteria

1. THE API SHALL provide a POST /api/v1/targets/enrollment-token endpoint that generates Enrollment_Tokens
2. WHEN the enrollment-token endpoint receives an authenticated request, THE API SHALL generate a single-use Enrollment_Token (UUID)
3. THE Enrollment_Token SHALL expire after 10 minutes
4. THE API SHALL provide a POST /api/v1/targets/enroll endpoint that completes enrollment
5. WHEN the enroll endpoint receives an Enrollment_Token and Target_Machine metadata, THE API SHALL validate the token
6. WHEN the token is valid, THE API SHALL generate a Target_Identity (UUID + Ed25519 key pair)
7. WHEN the Target_Identity is generated, THE API SHALL store the Target_Machine record with metadata
8. THE enroll endpoint SHALL return the Target_Identity credentials (target_id, private_key, public_key)
9. THE API SHALL provide a GET /api/v1/targets endpoint that lists enrolled targets for authenticated users
10. THE API SHALL provide a DELETE /api/v1/targets/:id endpoint that revokes Target_Identity credentials

### Requirement 21: API Target Heartbeat Endpoint

**User Story:** As a CIG API developer, I want to implement a heartbeat endpoint, so that enrolled Target_Machines can report their status.

#### Acceptance Criteria

1. THE API SHALL provide a POST /api/v1/targets/:id/heartbeat endpoint that receives heartbeat messages
2. WHEN the heartbeat endpoint receives a request, THE API SHALL validate the Target_Identity signature
3. THE heartbeat request SHALL include a signature header signed with the Target_Machine's private key
4. WHEN the signature is valid, THE API SHALL update the Target_Machine's last_seen timestamp
5. WHEN the signature is invalid, THE API SHALL return 401 Unauthorized
6. THE heartbeat request body SHALL include service_status (object mapping service names to health status)
7. THE heartbeat request body SHALL include system_metrics (CPU usage, memory usage, disk usage)
8. WHEN the API receives heartbeat data, THE API SHALL store the latest metrics in the database
9. THE API SHALL emit a WebSocket event to connected Dashboard clients when heartbeat is received
10. THE heartbeat endpoint SHALL be rate-limited to 1 request per 30 seconds per Target_Machine


### Requirement 22: API Bootstrap Endpoints

**User Story:** As a CIG API developer, I want to implement bootstrap endpoints, so that self-hosted installations can complete initial admin setup.

#### Acceptance Criteria

1. THE API SHALL provide a POST /api/v1/bootstrap/init endpoint that generates Bootstrap_Tokens
2. WHEN the bootstrap init endpoint receives a request from localhost, THE API SHALL generate a Bootstrap_Token (32 characters)
3. THE Bootstrap_Token SHALL expire 30 minutes after first use
4. THE API SHALL provide a POST /api/v1/bootstrap/complete endpoint that completes bootstrap
5. WHEN the complete endpoint receives a Bootstrap_Token and admin account details, THE API SHALL validate the token
6. WHEN the token is valid, THE API SHALL create the admin user account with full permissions
7. WHEN the admin account is created, THE API SHALL invalidate the Bootstrap_Token
8. THE complete endpoint SHALL return access_token and refresh_token for the new admin account
9. THE API SHALL provide a GET /api/v1/bootstrap/status endpoint that checks if bootstrap is required
10. WHEN the status endpoint is called, THE API SHALL return requires_bootstrap: true if no admin accounts exist

### Requirement 23: API Install Manifest Endpoint

**User Story:** As a CIG API developer, I want to provide install manifests to CLI, so that managed installations receive correct configuration.

#### Acceptance Criteria

1. THE API SHALL provide a GET /api/v1/targets/install-manifest endpoint that returns Install_Manifests
2. WHEN the manifest endpoint receives an authenticated request with Enrollment_Token, THE API SHALL generate a manifest
3. THE Install_Manifest SHALL include docker_compose_template (YAML string)
4. THE Install_Manifest SHALL include environment_variables (object mapping variable names to values)
5. THE Install_Manifest SHALL include Target_Identity credentials
6. THE Install_Manifest SHALL include CIG cloud API endpoint URL
7. THE Install_Manifest SHALL include service_versions (object mapping service names to Docker image tags)
8. WHEN the manifest is generated, THE API SHALL include the Target_Machine's Install_Profile
9. THE manifest endpoint SHALL be accessible only with valid Enrollment_Token
10. WHEN the Enrollment_Token is invalid or expired, THE manifest endpoint SHALL return 401 Unauthorized

### Requirement 24: Data Model - Device Authorization

**User Story:** As a CIG database administrator, I want to store device authorization data, so that the system can track pending and approved devices.

#### Acceptance Criteria

1. THE database SHALL include a device_authorizations table with columns: id, device_code, user_code, user_id, status, created_at, expires_at
2. THE device_code column SHALL be indexed for fast lookup
3. THE user_code column SHALL be indexed for fast lookup
4. THE status column SHALL accept values: pending, approved, denied, expired
5. WHEN a device authorization expires, THE API SHALL mark the status as "expired"
6. WHEN a device authorization is approved or denied, THE API SHALL update the status and user_id
7. THE API SHALL delete device authorization records older than 24 hours


### Requirement 25: Data Model - Target Machines

**User Story:** As a CIG database administrator, I want to store Target_Machine data, so that the system can track enrolled machines and their status.

#### Acceptance Criteria

1. THE database SHALL include a targets table with columns: id, user_id, hostname, os, architecture, ip_address, install_profile, status, public_key, created_at, last_seen_at
2. THE id column SHALL be a UUID serving as the Target_Identity
3. THE user_id column SHALL be a foreign key to the users table
4. THE status column SHALL accept values: enrolled, online, degraded, offline, unauthorized
5. THE public_key column SHALL store the Ed25519 public key for signature verification
6. THE last_seen_at column SHALL be updated on every heartbeat
7. THE API SHALL index the user_id column for fast user-specific queries
8. THE API SHALL index the status column for fast status filtering

### Requirement 26: Data Model - Enrollment Tokens

**User Story:** As a CIG database administrator, I want to store Enrollment_Tokens, so that the system can validate enrollment requests.

#### Acceptance Criteria

1. THE database SHALL include an enrollment_tokens table with columns: id, user_id, token, used, created_at, expires_at
2. THE token column SHALL be a UUID
3. THE token column SHALL be indexed for fast lookup
4. THE used column SHALL be a boolean indicating if the token has been consumed
5. WHEN an Enrollment_Token is used, THE API SHALL set used to true
6. THE API SHALL delete enrollment tokens older than 24 hours

### Requirement 27: Data Model - Bootstrap Tokens

**User Story:** As a CIG database administrator, I want to store Bootstrap_Tokens, so that self-hosted installations can complete initial setup.

#### Acceptance Criteria

1. THE database SHALL include a bootstrap_tokens table with columns: id, token, used, first_used_at, created_at, expires_at
2. THE token column SHALL be a 32-character random string
3. THE token column SHALL be indexed for fast lookup
4. THE used column SHALL be a boolean indicating if the token has been consumed
5. THE first_used_at column SHALL be set when the token is first validated
6. THE expires_at column SHALL be 30 minutes after first_used_at
7. WHEN a Bootstrap_Token is used to create an admin account, THE API SHALL set used to true

### Requirement 28: Data Model - Target Heartbeats

**User Story:** As a CIG database administrator, I want to store Target_Machine heartbeat data, so that the system can track historical metrics.

#### Acceptance Criteria

1. THE database SHALL include a target_heartbeats table with columns: id, target_id, service_status, cpu_usage, memory_usage, disk_usage, created_at
2. THE target_id column SHALL be a foreign key to the targets table
3. THE service_status column SHALL be a JSON object mapping service names to health status
4. THE cpu_usage, memory_usage, and disk_usage columns SHALL be decimal percentages (0-100)
5. THE API SHALL retain heartbeat records for 30 days
6. THE API SHALL delete heartbeat records older than 30 days automatically


### Requirement 29: Security - Credential Encryption

**User Story:** As a security engineer, I want all stored credentials encrypted at rest, so that unauthorized access to the filesystem does not compromise secrets.

#### Acceptance Criteria

1. THE CLI SHALL encrypt all stored credentials using AES-256-GCM
2. THE CLI SHALL derive encryption keys using PBKDF2 with 100,000 iterations
3. THE CLI SHALL use machine-specific salt (hostname + username hash)
4. THE CLI SHALL store initialization vectors (IVs) alongside encrypted data
5. THE CLI SHALL validate authentication tags before decrypting data
6. WHEN decryption fails, THE CLI SHALL prompt the user to re-authenticate
7. THE CLI SHALL set file permissions to 0600 for all credential files

### Requirement 30: Security - Token Rotation

**User Story:** As a security engineer, I want access tokens to expire and refresh automatically, so that compromised tokens have limited validity.

#### Acceptance Criteria

1. THE API SHALL issue access tokens with 1-hour expiration
2. THE API SHALL issue refresh tokens with 30-day expiration
3. WHEN an access token expires, THE CLI SHALL use the refresh token to obtain a new access token
4. WHEN a refresh token expires, THE CLI SHALL require the user to re-authenticate via `cig login`
5. THE API SHALL provide a POST /api/v1/auth/refresh endpoint that exchanges refresh tokens for new access tokens
6. WHEN a refresh token is used, THE API SHALL issue a new refresh token and invalidate the old one (rotation)
7. THE API SHALL rate-limit the refresh endpoint to 10 requests per minute per user

### Requirement 31: Security - Audit Logging

**User Story:** As a security engineer, I want all authentication and enrollment events logged, so that I can audit security-relevant actions.

#### Acceptance Criteria

1. THE API SHALL log all device authorization requests with IP address and timestamp
2. THE API SHALL log all device authorization approvals and denials with user_id
3. THE API SHALL log all Target_Machine enrollment events with metadata
4. THE API SHALL log all Target_Identity revocations with user_id and reason
5. THE API SHALL log all failed authentication attempts with IP address
6. THE API SHALL log all Bootstrap_Token generation and usage events
7. THE audit logs SHALL be stored in a separate audit_logs table
8. THE audit logs SHALL be retained for 90 days
9. THE audit logs SHALL include event_type, user_id, target_id, ip_address, details, and timestamp

### Requirement 32: Security - Rate Limiting

**User Story:** As a security engineer, I want authentication endpoints rate-limited, so that brute-force attacks are mitigated.

#### Acceptance Criteria

1. THE API SHALL rate-limit device authorization requests to 5 per minute per IP address
2. THE API SHALL rate-limit device poll requests to 1 per 5 seconds per device_code
3. THE API SHALL rate-limit enrollment requests to 10 per hour per user
4. THE API SHALL rate-limit heartbeat requests to 1 per 30 seconds per Target_Machine
5. THE API SHALL rate-limit bootstrap requests to 5 per hour per IP address
6. WHEN rate limits are exceeded, THE API SHALL return 429 Too Many Requests
7. THE API SHALL include Retry-After header in 429 responses


### Requirement 33: User Experience - Progress Feedback

**User Story:** As a CIG user, I want clear progress feedback during installation, so that I understand what the CLI is doing.

#### Acceptance Criteria

1. WHEN installation begins, THE CLI SHALL display a progress indicator for each major step
2. THE CLI SHALL display real-time logs for Docker container startup
3. WHEN a step completes successfully, THE CLI SHALL display a green checkmark
4. WHEN a step fails, THE CLI SHALL display a red X and error details
5. WHEN waiting for health checks, THE CLI SHALL display a spinner with elapsed time
6. THE CLI SHALL display estimated time remaining for long-running operations
7. THE CLI SHALL use color-coded output (green for success, yellow for warnings, red for errors)
8. THE CLI SHALL support a `--quiet` flag that suppresses progress output
9. THE CLI SHALL support a `--verbose` flag that displays detailed debug logs

### Requirement 34: User Experience - Error Recovery

**User Story:** As a CIG user, I want clear error messages and recovery instructions, so that I can fix issues without external help.

#### Acceptance Criteria

1. WHEN an error occurs, THE CLI SHALL display a clear error message describing the problem
2. WHEN an error occurs, THE CLI SHALL display suggested remediation steps
3. WHEN a prerequisite check fails, THE CLI SHALL display installation instructions for missing dependencies
4. WHEN Docker is not running, THE CLI SHALL display instructions to start Docker
5. WHEN ports are in use, THE CLI SHALL display which processes are using the ports
6. WHEN network connectivity fails, THE CLI SHALL display network troubleshooting steps
7. THE CLI SHALL provide a `--help` flag for every command with usage examples
8. THE CLI SHALL provide a `cig troubleshoot` command that runs diagnostic checks and suggests fixes

### Requirement 35: User Experience - Non-Interactive Mode

**User Story:** As a CIG user, I want to run CLI commands non-interactively, so that I can automate installations in CI/CD pipelines.

#### Acceptance Criteria

1. THE CLI SHALL support a `--non-interactive` flag that disables all prompts
2. WHEN running in non-interactive mode, THE CLI SHALL use default values or fail if required values are missing
3. THE CLI SHALL support environment variables for all configuration options (CIG_MODE, CIG_PROFILE, CIG_REMOTE, etc.)
4. WHEN environment variables are set, THE CLI SHALL use them instead of prompting
5. THE CLI SHALL exit with status code 0 on success and non-zero on failure
6. THE CLI SHALL output JSON-formatted results when `--json` flag is provided
7. THE CLI SHALL log all output to stderr and results to stdout for easy parsing

### Requirement 36: Testing - CLI Integration Tests

**User Story:** As a CIG developer, I want comprehensive CLI integration tests, so that I can verify installation workflows work correctly.

#### Acceptance Criteria

1. THE test suite SHALL include integration tests for `cig login` device authorization flow
2. THE test suite SHALL include integration tests for `cig install` in both managed and self-hosted modes
3. THE test suite SHALL include integration tests for `cig status`, `cig start`, `cig stop`, and `cig restart`
4. THE test suite SHALL include integration tests for `cig uninstall` with and without `--purge-data`
5. THE test suite SHALL include integration tests for `cig upgrade`
6. THE test suite SHALL include integration tests for remote installation via SSH
7. THE test suite SHALL mock Docker and API interactions for fast test execution
8. THE test suite SHALL include end-to-end tests that deploy real Docker containers
9. THE test suite SHALL achieve >80% code coverage for CLI package


### Requirement 37: Testing - API Integration Tests

**User Story:** As a CIG developer, I want comprehensive API integration tests for authentication and enrollment, so that I can verify backend workflows work correctly.

#### Acceptance Criteria

1. THE test suite SHALL include integration tests for device authorization flow (authorize, poll, approve)
2. THE test suite SHALL include integration tests for Target_Machine enrollment flow
3. THE test suite SHALL include integration tests for heartbeat processing and status updates
4. THE test suite SHALL include integration tests for bootstrap flow
5. THE test suite SHALL include integration tests for token refresh and rotation
6. THE test suite SHALL include integration tests for rate limiting enforcement
7. THE test suite SHALL include integration tests for audit logging
8. THE test suite SHALL achieve >80% code coverage for new API endpoints

### Requirement 38: Testing - Dashboard Integration Tests

**User Story:** As a CIG developer, I want Dashboard integration tests for device approval and target management, so that I can verify UI workflows work correctly.

#### Acceptance Criteria

1. THE test suite SHALL include E2E tests for device authorization approval flow
2. THE test suite SHALL include E2E tests for viewing enrolled Target_Machines
3. THE test suite SHALL include E2E tests for Target_Machine detail view
4. THE test suite SHALL include E2E tests for Target_Identity revocation
5. THE test suite SHALL include E2E tests for self-hosted bootstrap flow
6. THE test suite SHALL use Playwright for E2E testing
7. THE test suite SHALL mock API responses for fast test execution

### Requirement 39: Documentation - User Guide

**User Story:** As a CIG user, I want comprehensive documentation, so that I can install and use CIG without confusion.

#### Acceptance Criteria

1. THE documentation SHALL include a "Getting Started" guide with installation instructions
2. THE documentation SHALL include a "Managed Mode Setup" guide with device authorization steps
3. THE documentation SHALL include a "Self-Hosted Mode Setup" guide with bootstrap instructions
4. THE documentation SHALL include a "Remote Installation" guide with SSH setup
5. THE documentation SHALL include a "CLI Command Reference" with all commands and flags
6. THE documentation SHALL include a "Troubleshooting" guide with common issues and solutions
7. THE documentation SHALL include a "Security Best Practices" guide
8. THE documentation SHALL be published in the docs/ directory and on the landing page

### Requirement 40: Documentation - API Reference

**User Story:** As a CIG developer, I want API documentation for authentication and enrollment endpoints, so that I can integrate with CIG programmatically.

#### Acceptance Criteria

1. THE documentation SHALL include OpenAPI/Swagger specification for all new endpoints
2. THE documentation SHALL include request/response examples for device authorization flow
3. THE documentation SHALL include request/response examples for enrollment flow
4. THE documentation SHALL include request/response examples for heartbeat flow
5. THE documentation SHALL include authentication requirements for each endpoint
6. THE documentation SHALL include rate limiting information for each endpoint
7. THE documentation SHALL be published at /api/v1/docs endpoint


### Requirement 41: Monorepo Integration - Package Dependencies

**User Story:** As a CIG developer, I want proper package dependencies configured, so that the CLI can use shared libraries.

#### Acceptance Criteria

1. THE packages/cli package.json SHALL include dependency on @cig/config for configuration management
2. THE packages/cli package.json SHALL include dependency on @cig/api types for API client
3. THE packages/api package.json SHALL include new dependencies: @noble/ed25519 for signature verification
4. THE packages/api package.json SHALL include new dependencies: uuid for token generation
5. THE root package.json SHALL include new dev dependencies: ssh2 for remote installation
6. THE pnpm workspace configuration SHALL allow cross-package imports
7. THE TurboRepo configuration SHALL define build order dependencies

### Requirement 42: Monorepo Integration - Configuration Management

**User Story:** As a CIG developer, I want centralized configuration for API endpoints and defaults, so that CLI and API share consistent settings.

#### Acceptance Criteria

1. THE packages/config SHALL export CIG_CLOUD_API_URL constant for managed mode API endpoint
2. THE packages/config SHALL export DEFAULT_INSTALL_PROFILE constant (value: "core")
3. THE packages/config SHALL export DEFAULT_PORTS constant for all services
4. THE packages/config SHALL export TOKEN_EXPIRATION constants (access: 3600s, refresh: 2592000s)
5. THE packages/config SHALL export HEARTBEAT_INTERVAL constant (value: 60s)
6. THE packages/config SHALL export DEVICE_CODE_EXPIRATION constant (value: 900s)
7. THE packages/config SHALL export ENROLLMENT_TOKEN_EXPIRATION constant (value: 600s)
8. THE packages/config SHALL export BOOTSTRAP_TOKEN_EXPIRATION constant (value: 1800s)

### Requirement 43: Wizard UI Deprecation

**User Story:** As a CIG developer, I want to deprecate the wizard-ui app, so that the CLI becomes the primary installation method.

#### Acceptance Criteria

1. THE apps/wizard-ui SHALL display a deprecation notice on the home page
2. THE deprecation notice SHALL recommend using `cig install` instead
3. THE deprecation notice SHALL include installation instructions for the CLI
4. THE wizard-ui SHALL remain functional for existing users during transition period
5. THE wizard-ui SHALL be removed in a future major version (v2.0.0)

### Requirement 44: Docker Compose Template Management

**User Story:** As a CIG developer, I want Docker Compose templates for different install profiles, so that the CLI can generate correct configurations.

#### Acceptance Criteria

1. THE packages/infra/docker directory SHALL include docker-compose.core.yml template for core profile
2. THE packages/infra/docker directory SHALL include docker-compose.full.yml template for full profile
3. THE core template SHALL include services: api, neo4j, dashboard, discovery, cartography
4. THE full template SHALL include all core services plus: chatbot, chroma, agents
5. THE templates SHALL use environment variable placeholders for secrets (e.g., ${NEO4J_PASSWORD})
6. THE CLI SHALL read templates from embedded resources or installation package
7. THE CLI SHALL substitute environment variables when generating final docker-compose.yml


### Requirement 45: Cross-Platform Support

**User Story:** As a CIG user, I want the CLI to work on Linux, macOS, and Windows, so that I can use CIG on my preferred platform.

#### Acceptance Criteria

1. THE CLI SHALL detect the operating system (Linux, macOS, Windows) automatically
2. THE CLI SHALL use platform-specific paths for configuration directory (~/.cig on Unix, %APPDATA%\cig on Windows)
3. THE CLI SHALL use platform-specific Docker commands (docker on Unix, docker.exe on Windows)
4. THE CLI SHALL handle platform-specific line endings (LF on Unix, CRLF on Windows)
5. WHEN running on Windows, THE CLI SHALL require WSL2 or Docker Desktop
6. WHEN running on macOS, THE CLI SHALL require Docker Desktop
7. WHEN running on Linux, THE CLI SHALL support native Docker Engine
8. THE CLI SHALL display platform-specific installation instructions in error messages

### Requirement 46: Offline Installation Support

**User Story:** As a CIG user, I want to install CIG in air-gapped environments, so that I can deploy CIG without internet access.

#### Acceptance Criteria

1. THE CLI SHALL support a `--offline` flag that skips internet connectivity checks
2. WHEN running in offline mode, THE CLI SHALL use pre-downloaded Docker images
3. WHEN running in offline mode, THE CLI SHALL skip version checks and updates
4. THE CLI SHALL provide a `cig download-images` command that pre-downloads all required Docker images
5. WHEN `cig download-images` executes, THE CLI SHALL save images to a local directory
6. THE CLI SHALL provide a `cig load-images` command that loads images from local directory
7. THE documentation SHALL include instructions for offline installation

### Requirement 47: Telemetry and Analytics

**User Story:** As a CIG product manager, I want anonymous usage telemetry, so that I can understand how users interact with the CLI.

#### Acceptance Criteria

1. THE CLI SHALL collect anonymous usage telemetry (command usage, installation success/failure, errors)
2. THE telemetry SHALL NOT include personally identifiable information (PII)
3. THE telemetry SHALL NOT include credentials, tokens, or secrets
4. THE CLI SHALL provide a `--no-telemetry` flag to disable telemetry
5. THE CLI SHALL respect DO_NOT_TRACK environment variable
6. THE CLI SHALL display a telemetry notice on first run with opt-out instructions
7. THE CLI SHALL store telemetry preference in ~/.cig/config.json
8. THE telemetry data SHALL be sent to a dedicated analytics endpoint (not the main API)

### Requirement 48: Version Compatibility Checking

**User Story:** As a CIG user, I want the CLI to check version compatibility, so that I don't install incompatible versions.

#### Acceptance Criteria

1. WHEN the CLI starts, THE CLI SHALL check its own version against the minimum required version
2. WHEN installing in Managed_Mode, THE CLI SHALL check API version compatibility
3. WHEN the API version is incompatible, THE CLI SHALL display an error and suggest upgrading the CLI
4. WHEN the CLI version is incompatible, THE CLI SHALL display an error and suggest upgrading the API
5. THE CLI SHALL display a warning when using a pre-release or development version
6. THE CLI SHALL support a `--skip-version-check` flag to bypass compatibility checks


### Requirement 49: Installation Idempotency

**User Story:** As a CIG user, I want installation commands to be idempotent, so that I can safely re-run them without causing issues.

#### Acceptance Criteria

1. WHEN `cig install` is executed on an already-installed system, THE CLI SHALL detect the existing installation
2. WHEN an existing installation is detected, THE CLI SHALL prompt the user to upgrade, reinstall, or cancel
3. WHEN the user chooses upgrade, THE CLI SHALL execute `cig upgrade` workflow
4. WHEN the user chooses reinstall, THE CLI SHALL execute `cig uninstall` followed by fresh installation
5. WHEN `cig start` is executed on already-running services, THE CLI SHALL display "Services already running"
6. WHEN `cig stop` is executed on already-stopped services, THE CLI SHALL display "Services already stopped"
7. THE CLI SHALL handle partial installations gracefully and offer to complete or rollback

### Requirement 50: Multi-Target Management

**User Story:** As a CIG user, I want to manage multiple Target_Machines from one CLI installation, so that I can operate distributed CIG deployments.

#### Acceptance Criteria

1. THE CLI SHALL support a `--target` flag to specify which Target_Machine to operate on
2. THE CLI SHALL store multiple Target_Machine configurations in ~/.cig/targets/
3. THE CLI SHALL provide a `cig targets list` command that displays all configured targets
4. THE CLI SHALL provide a `cig targets add` command that adds a new target configuration
5. THE CLI SHALL provide a `cig targets remove` command that removes a target configuration
6. THE CLI SHALL provide a `cig targets switch` command that sets the default target
7. WHEN no `--target` flag is provided, THE CLI SHALL use the default target
8. WHEN operating on a remote target, THE CLI SHALL use SSH to execute commands

### Requirement 51: Configuration Validation

**User Story:** As a CIG user, I want the CLI to validate my configuration before installation, so that I can catch errors early.

#### Acceptance Criteria

1. THE CLI SHALL provide a `cig validate` command that checks configuration without installing
2. WHEN `cig validate` executes, THE CLI SHALL check Docker availability
3. WHEN `cig validate` executes, THE CLI SHALL check port availability
4. WHEN `cig validate` executes, THE CLI SHALL check system resources (memory, disk)
5. WHEN `cig validate` executes, THE CLI SHALL check network connectivity (for managed mode)
6. WHEN `cig validate` executes, THE CLI SHALL check authentication status (for managed mode)
7. WHEN validation passes, THE CLI SHALL display "Configuration is valid"
8. WHEN validation fails, THE CLI SHALL display specific errors and suggested fixes

### Requirement 52: Backup and Restore

**User Story:** As a CIG user, I want to backup and restore my CIG data, so that I can recover from failures or migrate to new machines.

#### Acceptance Criteria

1. THE CLI SHALL provide a `cig backup` command that creates a backup of CIG data
2. WHEN `cig backup` executes, THE CLI SHALL stop CIG services temporarily
3. WHEN `cig backup` executes, THE CLI SHALL export Neo4j database to a backup file
4. WHEN `cig backup` executes, THE CLI SHALL export Chroma data to a backup file
5. WHEN `cig backup` executes, THE CLI SHALL export configuration files to a backup archive
6. THE backup archive SHALL be stored in ~/.cig/backups/ with timestamp
7. THE CLI SHALL provide a `cig restore` command that restores from a backup
8. WHEN `cig restore` executes, THE CLI SHALL prompt for confirmation before overwriting data
9. WHEN `cig restore` executes, THE CLI SHALL stop services, restore data, and restart services
10. THE CLI SHALL support a `--backup-path` flag to specify custom backup location


### Requirement 53: Health Monitoring and Diagnostics

**User Story:** As a CIG user, I want detailed health monitoring and diagnostics, so that I can troubleshoot issues effectively.

#### Acceptance Criteria

1. THE CLI SHALL provide a `cig health` command that performs comprehensive health checks
2. WHEN `cig health` executes, THE CLI SHALL check Docker daemon status
3. WHEN `cig health` executes, THE CLI SHALL check all CIG service container status
4. WHEN `cig health` executes, THE CLI SHALL check service health endpoints (API /health, Neo4j, etc.)
5. WHEN `cig health` executes, THE CLI SHALL check network connectivity between services
6. WHEN `cig health` executes, THE CLI SHALL check disk space usage
7. WHEN `cig health` executes, THE CLI SHALL check memory usage
8. WHEN `cig health` executes, THE CLI SHALL display a health score (0-100)
9. WHEN health issues are detected, THE CLI SHALL display specific problems and remediation steps
10. THE CLI SHALL support a `--watch` flag that continuously monitors health

### Requirement 54: Log Management

**User Story:** As a CIG user, I want to view and manage CIG service logs, so that I can debug issues.

#### Acceptance Criteria

1. THE CLI SHALL provide a `cig logs` command that displays service logs
2. WHEN `cig logs` executes without arguments, THE CLI SHALL display logs from all services
3. THE CLI SHALL support a `--service` flag to display logs from specific services
4. THE CLI SHALL support a `--follow` flag to stream logs in real-time
5. THE CLI SHALL support a `--tail` flag to display last N lines (default: 100)
6. THE CLI SHALL support a `--since` flag to display logs since a timestamp
7. THE CLI SHALL color-code logs by service for readability
8. THE CLI SHALL provide a `cig logs --export` command that exports logs to a file

### Requirement 55: Performance Optimization

**User Story:** As a CIG developer, I want the CLI to be fast and responsive, so that users have a good experience.

#### Acceptance Criteria

1. THE CLI SHALL start and display help text within 100ms
2. THE CLI SHALL complete prerequisite checks within 5 seconds
3. THE CLI SHALL use parallel operations where possible (e.g., pulling Docker images)
4. THE CLI SHALL cache API responses for 5 minutes to reduce network calls
5. THE CLI SHALL use streaming for large file operations (backups, logs)
6. THE CLI SHALL display progress indicators for operations longer than 2 seconds
7. THE CLI SHALL optimize Docker operations using BuildKit and layer caching

### Requirement 56: Graceful Degradation

**User Story:** As a CIG user, I want the CLI to handle partial failures gracefully, so that I can continue working despite issues.

#### Acceptance Criteria

1. WHEN the API is unreachable in Managed_Mode, THE CLI SHALL fall back to local operations where possible
2. WHEN a single service fails to start, THE CLI SHALL continue starting other services
3. WHEN health checks timeout, THE CLI SHALL display a warning but not fail the installation
4. WHEN network connectivity is intermittent, THE CLI SHALL retry operations with exponential backoff
5. WHEN Docker operations fail, THE CLI SHALL display detailed error messages and suggest fixes
6. THE CLI SHALL never leave the system in an inconsistent state after failures


## Scope and Priorities

### In Scope for v1.0

1. Device authorization flow (OAuth 2.0 device code grant)
2. Target machine enrollment with persistent identity
3. Local Docker Compose installation (core and full profiles)
4. Self-hosted mode with bootstrap token
5. Managed mode with cloud API connection
6. Basic lifecycle management (start, stop, restart, status)
7. Dashboard integration for device approval and target management
8. Secure credential storage with AES-256-GCM
9. Installation rollback and uninstall
10. Linux support (Ubuntu 20.04+, Debian 11+, RHEL 8+)
11. Basic health checks and diagnostics
12. User documentation and CLI reference

### In Scope for v1.1 (Future)

1. Remote installation via SSH
2. macOS and Windows support
3. Multi-target management
4. Backup and restore functionality
5. Upgrade management with automatic rollback
6. Advanced health monitoring with continuous watch
7. Log aggregation and export
8. Offline installation support
9. Configuration validation command
10. Telemetry and analytics (opt-in)

### Out of Scope

1. Kubernetes-based installation (future major version)
2. Cloud provider-specific installers (AWS Marketplace, GCP Marketplace)
3. GUI installer application
4. Mobile device management
5. Automatic scaling and load balancing
6. Multi-region deployment orchestration
7. Built-in backup scheduling (use external cron/systemd)
8. Integration with external secret managers (HashiCorp Vault, AWS Secrets Manager)

## Success Criteria

The CLI Onboarding & Installer feature will be considered successful when:

1. A user can authenticate via `cig login` and approve the device in the Dashboard within 2 minutes
2. A user can install CIG in self-hosted mode with `cig install --mode self-hosted` and access the Dashboard within 5 minutes
3. A user can install CIG in managed mode with `cig install` and see their target in the Dashboard within 5 minutes
4. Installation success rate is >95% on supported Linux distributions
5. All prerequisite checks complete within 5 seconds
6. Docker Compose deployment completes within 3 minutes (excluding image pulls)
7. Health checks pass within 2 minutes of service startup
8. CLI commands respond within 100ms (excluding network operations)
9. User documentation covers all common use cases with examples
10. Integration test coverage is >80% for CLI and API components
11. Zero critical security vulnerabilities in authentication and enrollment flows
12. User satisfaction score is >4.0/5.0 based on feedback surveys

## Dependencies

### External Dependencies

1. Docker Engine 20.10+ or Docker Desktop
2. Docker Compose v2.0+
3. Internet connectivity (for managed mode and image pulls)
4. Minimum 4GB RAM and 10GB disk space
5. Available ports: 3000, 7474, 7687, 8000, 8080

### Internal Dependencies

1. CIG API with JWT authentication (already implemented)
2. CIG Dashboard with Next.js (already implemented)
3. Neo4j database (already configured)
4. Docker Compose infrastructure (already defined)
5. Existing CredentialManager in packages/cli (already implemented)

### New Dependencies to Add

1. @noble/ed25519 - Ed25519 signature generation and verification
2. uuid - UUID generation for tokens and identities
3. ssh2 - SSH client for remote installation (v1.1)
4. qrcode-terminal - QR code generation for device authorization
5. cli-progress - Progress bars for installation steps
6. chalk - Terminal color output
7. ora - Spinner animations for loading states

## Risk Assessment

### High Risk

1. **Security of device authorization flow** - Mitigation: Follow OAuth 2.0 RFC 8628 strictly, implement rate limiting, use short-lived codes
2. **Credential storage security** - Mitigation: Use AES-256-GCM with machine-specific keys, set strict file permissions (0600)
3. **Installation failures leaving system in broken state** - Mitigation: Implement comprehensive rollback, test extensively on multiple distributions

### Medium Risk

1. **Docker compatibility across distributions** - Mitigation: Test on Ubuntu, Debian, RHEL, CentOS, support Docker Engine and Docker Desktop
2. **Network connectivity issues during installation** - Mitigation: Implement retry logic with exponential backoff, provide offline mode in v1.1
3. **Port conflicts with existing services** - Mitigation: Check port availability before installation, allow custom port configuration

### Low Risk

1. **User confusion with two operational modes** - Mitigation: Clear documentation, interactive prompts with explanations
2. **Performance on low-resource systems** - Mitigation: Document minimum requirements, provide core profile for minimal installations
3. **Cross-platform path handling** - Mitigation: Use Node.js path module, test on all supported platforms

## Open Questions

1. **Should we support custom Docker Compose files?** - Decision: No for v1.0, consider for v1.1 with validation
2. **Should we proxy Dashboard access through cloud API?** - Decision: No for v1.0, direct access only, consider for v2.0
3. **Should we support multiple CIG accounts per CLI?** - Decision: No for v1.0, single account only
4. **Should we implement automatic updates?** - Decision: No for v1.0, manual upgrade command only
5. **Should we support Docker Swarm or Kubernetes?** - Decision: No for v1.0, Docker Compose only
6. **Should we collect crash reports automatically?** - Decision: No for v1.0, manual bug reporting only

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-16  
**Status:** Ready for Review
