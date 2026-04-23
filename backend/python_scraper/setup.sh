#!/bin/bash

echo "🔧 Setting up SRM Portal Python Scraper..."
echo ""

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3 first:"
    echo "  macOS: brew install python3"
    echo "  Linux: sudo apt-get install python3"
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"
echo ""

# Check if pip3 is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed"
    echo "Please install pip3 first"
    exit 1
fi

echo "✓ pip3 found"
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ Python dependencies installed"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo ""

# Check if ChromeDriver is installed
if command -v chromedriver &> /dev/null; then
    echo "✓ ChromeDriver found: $(chromedriver --version | head -n 1)"
else
    echo "⚠️  ChromeDriver not found"
    echo ""
    echo "Installing ChromeDriver..."
    
    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install chromedriver
            echo "✓ ChromeDriver installed via Homebrew"
        else
            echo "❌ Homebrew not found. Please install ChromeDriver manually:"
            echo "  brew install chromedriver"
            echo "  or download from: https://chromedriver.chromium.org/"
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Please install ChromeDriver:"
        echo "  sudo apt-get install chromium-chromedriver"
        echo "  or download from: https://chromedriver.chromium.org/"
    else
        echo "Please install ChromeDriver manually:"
        echo "  https://chromedriver.chromium.org/"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test the scraper:"
echo "  python3 srm_portal_scraper.py \"your@srmist.edu.in\" \"your_password\""
echo ""
echo "The scraper will automatically be used as fallback when Puppeteer fails."
echo ""
