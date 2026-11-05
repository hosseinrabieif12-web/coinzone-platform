#!/usr/bin/env bash
# COINZONE GitHub Upload & Deployment Script
# Usage: ./scripts/push_to_github.sh <GITHUB_USERNAME> <GITHUB_TOKEN> [REPO_NAME]

set -e

USERNAME=${1:-""}
TOKEN=${2:-""}
REPO=${3:-"coinzone-platform"}
BRANCH="main"

if [ -z "$USERNAME" ] || [ -z "$TOKEN" ]; then
  echo "خطا: لطفاً نام کاربری و توکن گیت‌هاب را ارسال کنید."
  echo "نحوه استفاده: ./scripts/push_to_github.sh <USERNAME> <TOKEN> [REPO_NAME]"
  exit 1
fi

echo "🚀 در حال راه‌اندازی و اتصال به گیت‌هاب برای مخزن: $USERNAME/$REPO ..."

# Initialize git if needed
if [ ! -d ".git" ]; then
  git init
  git checkout -b $BRANCH
fi

# Set git user if not set
git config user.name "COINZONE Admin" || true
git config user.email "admin@coinzone.gg" || true

# Add remote with credentials
REMOTE_URL="https://${USERNAME}:${TOKEN}@github.com/${USERNAME}/${REPO}.git"

if git remote get-url origin > /dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi

# Stage files
git add .
git commit -m "Auto-Deploy COINZONE Platform - $(date)" || echo "تغییر جدیدی برای کامیت وجود نداشت."

# Push to GitHub
echo "📦 در حال پوش کردن پروژه به شاخه $BRANCH در گیت‌هاب..."
git push -u origin $BRANCH --force

echo "✅ با موفقیت به گیت‌هاب منتقل گردید:"
echo "👉 https://github.com/${USERNAME}/${REPO}"
