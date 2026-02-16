#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const issues = [];
let filesChecked = 0;

// Common placeholder patterns to detect
// Note: bracket placeholders are handled separately to avoid matching JS/JSON arrays
const placeholderPatterns = [
    /TODO:/gi,                            // TODO: comments
    /FIXME:/gi,                           // FIXME: comments
    /example\.com/g,                      // example.com domain
    /your-username/gi,                    // your-username
    /your-font/gi,                        // your-font
    /your-brand-color/gi,                 // your-brand-color
    /G-XXXXXXXXXX/g,                      // Google Analytics placeholder
    /XXXXXXX/g,                           // Generic placeholder X's
    /@handle/g,                           // Social media @handle
    /company-name/gi,                     // company-name
    /Site Name/g,                         // Site Name
    /Company\/Client Name/g,              // Company/Client Name
    /email@example\.com/g,                // email@example.com
    /\+1 \(555\) 123-4567/g,             // Phone placeholder
];

// Bracket-style placeholders like [Site Name]. Only check these in text-like files
const bracketPlaceholder = /\[[^\]]*[A-Za-z][^\]]*\]/g;
const textLikeExts = ['.md', '.njk', '.html', '.txt'];

function checkFile(filePath, relativePath) {
    filesChecked++;

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const ext = path.extname(relativePath).toLowerCase();

            // Check bracket-style placeholders only in text-like files
            if (textLikeExts.includes(ext)) {
                let m;
                while ((m = bracketPlaceholder.exec(line)) !== null) {
                    const match = m[0];
                    const endIndex = m.index + match.length;

                        const nextChar = line[endIndex] || '';
                        // Skip if this looks like a Markdown link label (e.g. [Link](...))
                        if (nextChar === '(') continue;

                        // Extract inner text
                        const inner = match.slice(1, -1).trim();

                        // Skip code-like arrays that contain quotes (e.g., ["Font Name", "fallback"])
                        if (/['"]/.test(inner)) continue;

                        // Skip simple short tokens (e.g., [en], [lang], [x]) or simple comma lists like [tag1,tag2]
                        if (/^[A-Za-z0-9,_-]{1,5}$/.test(inner.replace(/\s+/g, ''))) continue;

                        // Otherwise treat as a placeholder and report it
                        issues.push({
                            file: relativePath,
                            line: index + 1,
                            match: match,
                            content: line.trim()
                        });
                }
            }

            // Run other placeholder patterns for all supported file types
            placeholderPatterns.forEach(pattern => {
                const matches = line.match(pattern);
                if (matches) {
                    issues.push({
                        file: relativePath,
                        line: index + 1,
                        match: matches[0],
                        content: line.trim()
                    });
                }
            });
        });
    } catch (error) {
        // Skip files that can't be read
    }
}

function checkJsonFile(filePath, relativePath) {
    filesChecked++;

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);

        function traverse(obj, path = '') {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;

                if (typeof value === 'string') {
                    placeholderPatterns.forEach(pattern => {
                        if (pattern.test(value)) {
                            issues.push({
                                file: relativePath,
                                path: currentPath,
                                match: value,
                                type: 'json-value'
                            });
                        }
                    });
                } else if (typeof value === 'object' && value !== null) {
                    traverse(value, currentPath);
                }
            }
        }

        traverse(data);
    } catch (error) {
        // Skip invalid JSON or files that can't be read
    }
}

function checkDirectory(dir, baseDir = dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        // Skip certain directories
        if (entry.isDirectory()) {
            const skipDirs = ['node_modules', '_site', '.git', 'dist', 'coverage'];
            if (skipDirs.includes(entry.name)) continue;

            checkDirectory(fullPath, baseDir);
        } else if (entry.isFile()) {
            // Skip certain files and directories that are documentation/examples
            const skipFiles = ['README.md', 'AGENTS.md', 'CLAUDE.md'];
            if (skipFiles.includes(entry.name)) continue;
            // Skip content posts (example content) to avoid template examples being flagged
            if (relativePath.includes(path.sep + 'posts' + path.sep)) continue;

            const ext = path.extname(entry.name);

            // Check JSON files specially
            if (ext === '.json') {
                checkJsonFile(fullPath, relativePath);
            }
            // Check text-based files
            else if (['.md', '.njk', '.html', '.js', '.css', '.txt', '.env.example'].includes(ext)) {
                checkFile(fullPath, relativePath);
            }
        }
    }
}

function checkTemplateFiles() {
    const projectRoot = path.join(__dirname, '..');
    const templateFiles = [
        'SITE.md.template',
        'src/_data/site.json.template',
        'src/_data/navigation.json.template'
    ];

    const foundTemplates = [];

    templateFiles.forEach(file => {
        const filePath = path.join(projectRoot, file);
        if (fs.existsSync(filePath)) {
            foundTemplates.push(file);
        }
    });

    return foundTemplates;
}

// Main execution
console.log(`\n${colors.cyan}🔍 Validating project configuration...${colors.reset}\n`);

const projectRoot = path.join(__dirname, '..');

// Check for unrenamed template files
const templateFiles = checkTemplateFiles();
if (templateFiles.length > 0) {
    console.log(`${colors.yellow}⚠️  Template files not renamed:${colors.reset}`);
    templateFiles.forEach(file => {
        console.log(`   ${colors.yellow}•${colors.reset} ${file}`);
    });
    console.log(`\n   Run ${colors.cyan}npm run init${colors.reset} or manually rename these files.\n`);
}

// Check all project files for placeholders
checkDirectory(projectRoot);

console.log(`${colors.blue}📊 Checked ${filesChecked} files${colors.reset}\n`);

// Report issues
if (issues.length > 0) {
    console.log(`${colors.yellow}⚠️ Found ${issues.length} placeholder(s) in the repository:${colors.reset}\n`);

    // Group issues by file
    const issuesByFile = {};
    issues.forEach(issue => {
        if (!issuesByFile[issue.file]) {
            issuesByFile[issue.file] = [];
        }
        issuesByFile[issue.file].push(issue);
    });

    // Display grouped issues
    Object.entries(issuesByFile).forEach(([file, fileIssues]) => {
        console.log(`${colors.yellow}📄 ${file}${colors.reset}`);

        fileIssues.forEach(issue => {
            if (issue.type === 'json-value') {
                console.log(`   ${colors.red}•${colors.reset} ${issue.path}: ${colors.cyan}"${issue.match}"${colors.reset}`);
            } else {
                console.log(`   ${colors.red}•${colors.reset} Line ${issue.line}: ${colors.cyan}${issue.match}${colors.reset}`);
                if (issue.content.length < 100) {
                    console.log(`     ${colors.reset}${issue.content}${colors.reset}`);
                }
            }
        });
        console.log('');
    });

    // Determine whether placeholders are in critical files (configs and SITE.md)
    const criticalIssues = issues.filter(i => i.file === 'SITE.md' || i.file.startsWith('src/_data'));

    if (criticalIssues.length > 0) {
        console.log(`${colors.red}❌ Found ${criticalIssues.length} placeholder(s) in critical configuration files. Please update these before deployment.${colors.reset}\n`);
        process.exit(1);
    } else {
        console.log(`${colors.cyan}ℹ️ Non-critical placeholders were found (documentation or example content). These do not block validation.${colors.reset}\n`);
        process.exit(0);
    }
} else if (templateFiles.length > 0) {
    console.log(`${colors.yellow}⚠️  Rename template files to continue.${colors.reset}\n`);
    process.exit(1);
} else {
    console.log(`${colors.green}✅ All configuration looks good! No placeholders found.${colors.reset}\n`);
    process.exit(0);
}