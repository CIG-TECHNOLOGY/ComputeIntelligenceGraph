#!/bin/bash

# LLM Proxy Release Management Script
# Handles patch releases and API updates via GitHub tags

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PACKAGE_JSON="packages/llm-proxy/package.json"
GITHUB_REPO="CIG-TECHNOLOGY/ComputeIntelligenceGraph"

# Functions
print_header() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  $1${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

get_current_version() {
  grep '"version"' "$PACKAGE_JSON" | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/'
}

increment_patch() {
  local version=$1
  local major=$(echo $version | cut -d. -f1)
  local minor=$(echo $version | cut -d. -f2)
  local patch=$(echo $version | cut -d. -f3)
  
  patch=$((patch + 1))
  echo "$major.$minor.$patch"
}

update_version() {
  local new_version=$1
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"
}

create_release() {
  local version=$1
  local tag="llm-proxy-v$version"
  
  print_header "Creating Release: $tag"
  
  # Update package.json
  print_info "Updating package.json to version $version..."
  update_version "$version"
  print_success "Version updated"
  
  # Commit changes
  print_info "Committing changes..."
  git add "$PACKAGE_JSON"
  git commit -m "chore(llm-proxy): release v$version"
  print_success "Changes committed"
  
  # Create tag
  print_info "Creating tag: $tag"
  git tag "$tag"
  print_success "Tag created"
  
  # Push changes and tag
  print_info "Pushing to GitHub..."
  git push origin main
  git push origin "$tag"
  print_success "Pushed to GitHub"
  
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  Release Created Successfully!                             ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Release Tag: $tag"
  echo "GitHub Actions will now:"
  echo "  1. Detect changes"
  echo "  2. Validate code"
  echo "  3. Build Docker image"
  echo "  4. Update Lambda function"
  echo "  5. Run smoke tests"
  echo ""
  echo "Monitor at: https://github.com/$GITHUB_REPO/actions"
  echo ""
}

# Main
case "${1:-}" in
  patch)
    current_version=$(get_current_version)
    new_version=$(increment_patch "$current_version")
    
    print_info "Current version: $current_version"
    print_info "New version: $new_version"
    echo ""
    
    read -p "Create patch release v$new_version? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      create_release "$new_version"
    else
      print_error "Release cancelled"
      exit 1
    fi
    ;;
  
  custom)
    if [ -z "$2" ]; then
      print_error "Version not specified"
      echo "Usage: $0 custom <version>"
      exit 1
    fi
    
    new_version=$2
    current_version=$(get_current_version)
    
    print_info "Current version: $current_version"
    print_info "New version: $new_version"
    echo ""
    
    read -p "Create release v$new_version? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      create_release "$new_version"
    else
      print_error "Release cancelled"
      exit 1
    fi
    ;;
  
  status)
    current_version=$(get_current_version)
    print_header "LLM Proxy Release Status"
    echo ""
    echo "Current Version: $current_version"
    echo "Next Patch: $(increment_patch $current_version)"
    echo ""
    echo "Recent Tags:"
    git tag -l "llm-proxy-v*" | sort -V | tail -5
    echo ""
    ;;
  
  *)
    echo "LLM Proxy Release Management"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  patch              Create a patch release (auto-increment)"
    echo "  custom <version>   Create a custom release (e.g., 1.0.0)"
    echo "  status             Show current version and recent tags"
    echo ""
    echo "Examples:"
    echo "  $0 patch"
    echo "  $0 custom 1.0.0"
    echo "  $0 status"
    echo ""
    ;;
esac
