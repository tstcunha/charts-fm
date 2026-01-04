# Connecting to GitHub Repository

## Step 1: Initialize Git (if not already done)

```bash
cd /Users/thiago/chartsfm
git init
```

## Step 2: Add All Files

```bash
git add .
```

This will add all files except those in `.gitignore` (like `.env`, `node_modules`, etc.)

## Step 3: Make Your First Commit

```bash
git commit -m "Initial commit: Next.js ChartsFM project setup"
```

## Step 4: Add Your GitHub Repository as Remote

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

For example, if your repo is `https://github.com/thiagodacunha/chartsfm`, you would run:
```bash
git remote add origin https://github.com/thiagodacunha/chartsfm.git
```

## Step 5: Push to GitHub

### Option A: If using HTTPS (most common)

You'll be prompted for credentials. GitHub now requires a **Personal Access Token** instead of your password:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "ChartsFM Project"
4. Select scopes: check `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. When pushing, use your GitHub username and paste the token as the password

```bash
git branch -M main
git push -u origin main
```

### Option B: If using SSH (if you have SSH keys set up)

First, check if you have SSH keys:
```bash
ls -la ~/.ssh
```

If you see `id_rsa` or `id_ed25519`, you can use SSH:

```bash
git remote set-url origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Verify Your Setup

Check which account will be used:
```bash
git config user.name
git config user.email
```

If you need to change it:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Important Notes

- **Never commit `.env` file** - it contains secrets! (Already in `.gitignore`)
- **Never commit `node_modules`** - too large! (Already in `.gitignore`)
- Your commits will show as: **Thiago <133756588+thiagodacunha@users.noreply.github.com>**

