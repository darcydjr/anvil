# Design System Debug Guide

This guide will help you diagnose and report design system issues.

## Quick Access to Debug Page

The debug page is now available at:

**🔗 http://localhost:5173/debug/design-system**

(You must be logged in to access it)

---

## How to Use the Debug Page

### Step 1: Access the Debug Page

1. Make sure the application is running:
   ```bash
   ./restart.sh
   # OR
   npm start & cd client && npm run dev
   ```

2. Open your browser and go to:
   - Main app: http://localhost:5173
   - Login with your credentials
   - Navigate to: http://localhost:5173/debug/design-system

### Step 2: Gather Debug Information

The debug page shows:
- ✅ Current active theme (light/dark/system)
- ✅ CSS variables and their computed values
- ✅ Visual color swatches for all design tokens
- ✅ Tailwind utility class tests
- ✅ Raw JSON data for easy copy-paste

### Step 3: Share Debug Info with Claude

You have **3 options** to share the debug information:

#### Option 1: Browser Console (RECOMMENDED)
1. Open browser DevTools:
   - Mac: `Cmd + Option + I`
   - Windows/Linux: `F12` or `Ctrl + Shift + I`
2. Click the **Console** tab
3. Look for the section that says **"🎨 Design System Debug Info"**
4. Expand it by clicking the arrow
5. **Right-click** on the expanded object → **Copy object**
6. Paste the entire output in your message to Claude

**Example of what to look for:**
```
🎨 Design System Debug Info
  Theme mode: "light"
  CSS Variables: {...}
  Tailwind Status: "✅ Tailwind loaded"
  Document classes: "light"
```

#### Option 2: Screenshot the Debug Page
1. Navigate to http://localhost:5173/debug/design-system
2. Take a **full-page screenshot** (scroll down to capture everything)
3. Share the screenshot(s) with Claude

#### Option 3: Copy Raw JSON
1. Scroll to the bottom of the debug page
2. Find the section titled **"📄 Raw Data (Copy-Paste Ready)"**
3. Click inside the code block
4. Select all (`Cmd+A` or `Ctrl+A`)
5. Copy and paste into your message to Claude

---

## What to Look For (Common Issues)

### Issue 1: CSS Variables Not Defined
**Symptoms:**
- Color swatches are blank
- Values show "❌ NOT SET"

**What to share with Claude:**
```
CSS Variables section shows:
--color-background: ❌ NOT SET
--color-foreground: ❌ NOT SET
```

### Issue 2: Tailwind Not Loading
**Symptoms:**
- Tailwind Status shows: "❌ Tailwind NOT working"
- Color boxes all look the same

**What to share with Claude:**
```
Tailwind Status: ❌ Tailwind NOT working (bg-primary = transparent)
```

### Issue 3: Dark Mode Not Working
**Symptoms:**
- Theme toggle doesn't change colors
- HTML Classes don't include "dark"

**What to share with Claude:**
```
Current Theme: dark
HTML Classes: (none)  ← Should show "dark" here
```

### Issue 4: Wrong Colors Displaying
**Symptoms:**
- Colors don't match the design system specification
- Colors look like default Tailwind colors

**What to share with Claude:**
Take a screenshot of the "CSS Variables" section showing the computed values

---

## Additional Browser Debugging

### Check Computed Styles
1. Right-click on any colored element on the debug page
2. Select **"Inspect"** or **"Inspect Element"**
3. In the DevTools panel, look for the **"Computed"** tab
4. Search for color-related properties
5. Screenshot the Computed styles panel
6. Share with Claude

### Check Network Tab
1. Open DevTools → **Network** tab
2. Reload the page (`Cmd+R` or `Ctrl+R`)
3. Filter by "CSS" or search for "index.css"
4. Click on `index.css` in the list
5. Click the **"Preview"** or **"Response"** tab
6. Check if the CSS variables are present
7. Screenshot and share with Claude

### Check for CSS Errors
1. Open DevTools → **Console** tab
2. Look for any red error messages
3. Look for warnings (yellow triangles)
4. Copy any error messages related to CSS or Tailwind
5. Share with Claude

---

## Quick Diagnostic Commands

Run these commands in your terminal and share the output with Claude:

### Check Tailwind Version
```bash
cd client && npm list tailwindcss
```

### Check PostCSS Config
```bash
cat client/postcss.config.js
```

### Check Tailwind Config
```bash
cat client/tailwind.config.js
```

### Check CSS File
```bash
head -80 client/src/index.css
```

### Check Client Logs for Errors
```bash
tail -50 /tmp/anvil-client.log | grep -i error
```

---

## What Information Claude Needs

When reporting a design system issue, provide:

1. **Debug Page URL**: Confirm you can access http://localhost:5173/debug/design-system
2. **Console Output**: The "🎨 Design System Debug Info" from browser console
3. **Screenshot**: Full-page screenshot of the debug page
4. **Description**: What you're seeing vs. what you expect to see
5. **Browser**: Which browser you're using (Chrome, Firefox, Safari, etc.)

---

## Example Message to Claude

```
Hi Claude, the design system still isn't working. Here's the debug info:

Browser Console Output:
{
  "theme": "light",
  "htmlClasses": "",
  "tailwindStatus": "❌ Tailwind NOT working (bg-primary = transparent)",
  "cssVariables": {
    "--color-background": "",
    "--color-foreground": ""
  }
}

I'm using Chrome on Mac. The debug page shows that CSS variables are NOT SET.
Screenshot attached.
```

---

## Manual Verification Steps

### Test 1: Check if index.css is loading
1. Open http://localhost:5173
2. Open DevTools → **Sources** tab
3. Navigate to `localhost:5173` → `src` → `index.css`
4. Verify you can see the `:root` section with `--color-*` variables
5. If you can't find it or it's empty, share this with Claude

### Test 2: Check if Tailwind classes work
1. Open the main dashboard page
2. Right-click on the header
3. Select "Inspect"
4. In the **Styles** panel, look for Tailwind classes like `bg-background`
5. Check if they have actual color values or if they're crossed out
6. Screenshot and share with Claude

### Test 3: Check theme switching
1. Find the theme toggle button (moon/sun icon)
2. Click it to switch between light/dark
3. Watch the HTML element in DevTools:
   - Should add/remove `class="dark"` on `<html>` element
4. If the class doesn't change, share this with Claude

---

## Troubleshooting Tips

### If Debug Page Won't Load
- Make sure you're logged in
- Check the browser console for errors
- Verify the URL is exactly: http://localhost:5173/debug/design-system

### If Colors Look Wrong
- Clear browser cache (Cmd+Shift+Delete or Ctrl+Shift+Delete)
- Hard reload (Cmd+Shift+R or Ctrl+Shift+R)
- Try a different browser

### If Nothing Happens
- Restart the application: `./restart.sh`
- Check that both server and client are running
- Verify no errors in `/tmp/anvil-client.log`

---

## Support

If you're stuck, share:
1. Console output from the debug page
2. Any error messages from the browser console
3. Output from `./restart.sh`
4. Screenshots

Claude will use this information to diagnose and fix the issue.
