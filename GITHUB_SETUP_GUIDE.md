# 🚀 GitHub Setup Guide - Git GUI & Git Bash Methods

## Method 1: Using Git Bash (Recommended)

### Step 1: Open Git Bash
1. Right-click in your project folder `c:\Users\2245109\mood-garden`
2. Select **"Git Bash Here"**
3. Or open Git Bash and navigate: `cd /c/Users/2245109/mood-garden`

### Step 2: Create GitHub Repository
**First, go to GitHub website:**
1. Visit: https://github.com/2245109_cgcp
2. Click **"New"** button (green button)
3. Repository name: `mood-garden`
4. Description: `Mental wellness app with AI-powered mood tracking and virtual garden`
5. Set to **Public**
6. **IMPORTANT**: Do NOT check any of these boxes:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
7. Click **"Create repository"**

### Step 3: Connect and Push (Git Bash Commands)
```bash
# Check current status
git status

# Add remote repository (replace URL with your actual repo URL)
git remote add origin https://github.com/2245109_cgcp/mood-garden.git

# Verify remote was added
git remote -v

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 4: Enter Credentials
When prompted, enter:
- **Username**: 2245109_cgcp
- **Password**: Your GitHub Personal Access Token (not your regular password)

---

## Method 2: Using Git GUI

### Step 1: Open Git GUI
1. Right-click in your project folder `c:\Users\2245109\mood-garden`
2. Select **"Git GUI Here"**

### Step 2: Create GitHub Repository (Same as above)
Follow the same GitHub website steps from Method 1.

### Step 3: Add Remote Repository
1. In Git GUI, go to **Remote** → **Add...**
2. Name: `origin`
3. Location: `https://github.com/2245109_cgcp/mood-garden.git`
4. Click **Add**

### Step 4: Push to GitHub
1. Go to **Remote** → **Push**
2. Select **origin** as the destination
3. Select **main** as the branch
4. Click **Push**
5. Enter your GitHub credentials when prompted

---

## Method 3: Using GitHub Desktop (Alternative)

### Step 1: Install GitHub Desktop
1. Download from: https://desktop.github.com/
2. Install and sign in with your GitHub account

### Step 2: Add Existing Repository
1. Click **"Add an Existing Repository from your hard drive"**
2. Choose folder: `c:\Users\2245109\mood-garden`
3. Click **"Add Repository"**

### Step 3: Publish to GitHub
1. Click **"Publish repository"**
2. Name: `mood-garden`
3. Description: `Mental wellness app with AI-powered mood tracking and virtual garden`
4. Choose Public/Private
5. Click **"Publish Repository"**

---

## 🔐 GitHub Authentication Notes

### Personal Access Token Setup
If you don't have a Personal Access Token:
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **"Generate new token"**
3. Select scopes: `repo`, `workflow`
4. Copy the token and use it as your password

### SSH Setup (Alternative)
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to GitHub
cat ~/.ssh/id_ed25519.pub
```

---

## ✅ Quick Verification Commands

After pushing, verify everything worked:

```bash
# Check remote connection
git remote -v

# Check branch
git branch -a

# Check last commit
git log --oneline -1

# Visit your repository
echo "Check: https://github.com/2245109_cgcp/mood-garden"
```

---

## 🆘 Troubleshooting

### Common Issues:

**1. "Repository not found"**
- Make sure you created the repository on GitHub first
- Check the URL is correct

**2. "Authentication failed"**
- Use Personal Access Token, not password
- Check username is correct: `2245109_cgcp`

**3. "Permission denied"**
- Repository might be set to private
- Check you're logged into the correct GitHub account

**4. "Branch protection rules"**
- If pushing fails, try: `git push --force origin main`

---

## 📋 Summary Commands for Git Bash

```bash
# 1. Navigate to project
cd /c/Users/2245109/mood-garden

# 2. Check status
git status

# 3. Add remote
git remote add origin https://github.com/2245109_cgcp/mood-garden.git

# 4. Push to GitHub
git push -u origin main
```

Choose the method you're most comfortable with. Git Bash is usually the most reliable!
