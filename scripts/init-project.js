#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

function renameIfExists(from, to) {
    const fromPath = path.join(__dirname, '..', from);
    const toPath = path.join(__dirname, '..', to);

    if (fs.existsSync(fromPath)) {
        fs.renameSync(fromPath, toPath);
        console.log(`✓ Renamed ${from} → ${to}`);
        return true;
    }
    return false;
}

function updateJsonFile(filePath, updates) {
    const fullPath = path.join(__dirname, '..', filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠ Warning: ${filePath} not found, skipping...`);
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const updated = { ...data, ...updates };
        fs.writeFileSync(fullPath, JSON.stringify(updated, null, 2) + '\n');
        console.log(`✓ Updated ${filePath}`);
    } catch (error) {
        console.error(`✗ Error updating ${filePath}:`, error.message);
    }
}

function generateColorScale(baseColor) {
    // Simple color scale generator - you can enhance this
    return {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: baseColor,
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
        950: '#082f49'
    };
}

async function init() {
    console.log('\n🚀 Initializing new project...\n');
    console.log('This will help you set up your project by updating configuration files.\n');

    // Gather information
    const siteName = await question('Site name: ');
    const siteDescription = await question('Site description (for SEO): ');
    const clientName = await question('Client/Company name: ');
    const clientEmail = await question('Contact email: ');
    const primaryColor = await question('Primary brand color (hex, e.g., #005af0): ');
    const siteUrl = await question('Production URL (e.g., https://example.com): ');

    const enableFrench = await question('Enable French language? (y/n): ');
    const enableBlog = await question('Enable blog/news section? (y/n): ');

    console.log('\n📝 Updating files...\n');

    // Update site.json
    updateJsonFile('src/_data/site.json', {
        title: siteName,
        description: siteDescription,
        url: siteUrl,
        author: clientName,
        email: clientEmail
    });

    // Update design tokens
    const tokensPath = path.join(__dirname, '..', 'design-tokens.json');
    if (fs.existsSync(tokensPath)) {
        try {
            const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
            if (primaryColor && primaryColor.startsWith('#')) {
                tokens.colors.primary = generateColorScale(primaryColor);
            }
            fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2) + '\n');
            console.log('✓ Updated design-tokens.json');
        } catch (error) {
            console.error('✗ Error updating design tokens:', error.message);
        }
    }

    // Update package.json
    updateJsonFile('package.json', {
        name: siteName.toLowerCase().replace(/\s+/g, '-'),
        description: siteDescription
    });

    // Clean up unused languages
    if (enableFrench.toLowerCase() !== 'y') {
        const frPath = path.join(__dirname, '..', 'src/fr');
        if (fs.existsSync(frPath)) {
            fs.rmSync(frPath, { recursive: true, force: true });
            console.log('✓ Removed French language directory');
        }
    }

    // Clean up blog if not needed
    if (enableBlog.toLowerCase() !== 'y') {
        const postsPath = path.join(__dirname, '..', 'src/en/posts');
        if (fs.existsSync(postsPath)) {
            fs.rmSync(postsPath, { recursive: true, force: true });
            console.log('✓ Removed blog/posts directory');
        }
    }

    // Update SITE.md with basic info
    const sitemdPath = path.join(__dirname, '..', 'SITE.md');
    if (fs.existsSync(sitemdPath)) {
        let siteMd = fs.readFileSync(sitemdPath, 'utf8');
        siteMd = siteMd
            .replace(/\[Site Name\]/g, siteName)
            .replace(/\[Company\/Client Name\]/g, clientName)
            .replace(/\[email@example\.com\]/g, clientEmail)
            .replace(/\[Production URL when launched\]/g, siteUrl)
            .replace(/\[Date\]/g, new Date().toISOString().split('T')[0]);
        fs.writeFileSync(sitemdPath, siteMd);
        console.log('✓ Updated SITE.md with project details');
    }

    console.log('\n✅ Project initialized successfully!\n');
    console.log('Next steps:');
    console.log('  1. Review and complete SITE.md with additional details');
    console.log('  2. Add your logo and favicon to src/assets/');
    console.log('  3. Run: npm run tokens (generate Tailwind config)');
    console.log('  4. Run: npm run dev (start development server)');
    console.log('\n📚 See README.md for the complete customization checklist.\n');

    rl.close();
}

// Run the initialization
init().catch(error => {
    console.error('\n✗ Initialization failed:', error.message);
    rl.close();
    process.exit(1);
});