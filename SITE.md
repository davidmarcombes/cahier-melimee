# SITE.md - Project-Specific Instructions

**Read `AGENTS.md` for generic stack documentation. This file contains project-specific details only.**

## Project Overview

**Project Name:** [Site Name]  
**Client:** [Company/Client Name]  
**Project Type:** [Marketing Site / Landing Page / Corporate Website / Portfolio]  
**Launch Date:** [Target Date]  
**Live URL:** [Production URL when launched]

### Primary Contact
- **Name:** [Contact Person]
- **Email:** [email@example.com]
- **Role:** [Marketing Director / Project Manager / etc.]

### Development Team
- **Developer:** [Your Name]
- **Designer:** [Designer Name if applicable]
- **Content:** [Who provides/approves content]

## Brand & Design Guidelines

### Tone of Voice
[Select appropriate descriptors and provide guidance]
- **Professional** / Friendly / Technical / Conversational / Formal / Casual
- **Key messaging:** [Core value propositions the site should communicate]
- **Avoid:** [Language, terms, or approaches to avoid]

### Visual Style
- **Photography style:** [Corporate / Lifestyle / Technical / Illustrations]
- **Iconography:** [Line / Solid / Duotone]
- **Imagery notes:** [Any specific requirements or restrictions]

## Content Structure

### Active Languages
- [x] English (en) - Primary language
- [ ] French (fr)
- [ ] German (de)
- [ ] Spanish (es)
- [ ] [Other]

**Default language:** [en]

### Page Structure

**Required Pages:**
- [x] Homepage (`/`) - [Brief description of content/purpose]
- [x] About (`/about/`) - [Company history, mission, team]
- [x] Services (`/services/`) - [Service offerings, features]
- [x] Contact (`/contact/`) - [Contact form, location, details]
- [ ] Blog/News (`/blog/`) - [If applicable]
- [ ] [Custom page] - [Description]

**Optional Pages:**
- [ ] Case Studies/Portfolio (`/work/` or `/case-studies/`)
- [ ] Team (`/team/`)
- [ ] FAQ (`/faq/`)
- [ ] Privacy Policy (`/privacy/`)
- [ ] Terms of Service (`/terms/`)

### Homepage Sections
In order from top to bottom:
1. **Hero** - [Headline focus, CTA purpose]
2. **Features/Services** - [Number of items, key points to highlight]
3. **About/Company** - [Brief intro or value proposition]
4. **Testimonials** - [Number of testimonials, source]
5. **Team** - [If showing team members, how many]
6. **CTA Section** - [Final conversion point]
7. **Footer** - [Links, contact info, social media]

### Navigation Structure
```
Primary Navigation:
- Home
- About
- Services
  - [Service 1]
  - [Service 2]
  - [Service 3]
- [Other top-level items]
- Contact

Footer Navigation:
- Company
  - About
  - Team
  - Careers
- Legal
  - Privacy
  - Terms
- Social Links
```

## Content Guidelines

### Blog/News (if applicable)
- **Posting Frequency:** [Weekly / Monthly / As needed]
- **Author:** [Who writes/approves posts]
- **Categories/Tags:** [List main categories]
- **Featured Images:** [Requirements - size, style, source]

### SEO Requirements
- **Target Keywords:** [Primary keywords for homepage and key pages]
- **Meta Description Guidelines:** [Length, tone, required elements]
- **Local SEO:** [If applicable - business location, service areas]

### Image Requirements
- **Minimum Resolution:** [e.g., 1920x1080 for hero images]
- **Aspect Ratios:** [Specific ratios for different sections]
- **File Formats:** [Preferred formats - will be optimized to AVIF/WebP]
- **Image Source:** [Client provides / Stock photos / Custom photography]
- **Alt Text:** [Who writes - developer or client]

### Performance Requirements
- **Target Lighthouse Score:** [Desktop: 95+, Mobile: 95+]
- **Core Web Vitals:** [Any specific requirements]
- **Image Optimization:** [Automatic via @11ty/eleventy-img]
- **Critical CSS:** [Inlined in head]

## Design System Customization

### Custom Components Needed
- [ ] **Hero Section:** [Specific layout or animation requirements]
- [ ] **Service Cards:** [Layout: grid/carousel, number of items]
- [ ] **Testimonial Slider:** [Auto-play, number visible, controls]
- [ ] **Team Grid:** [Hover effects, modal pop-ups for bios]
- [ ] **Stats/Counters:** [Animated numbers on scroll]
- [ ] **Timeline:** [Company history or process visualization]
- [ ] **Pricing Tables:** [If applicable - tiers, features]
- [ ] **FAQ Accordion:** [Categorized or single list]
- [ ] **[Custom component]:** [Description]

### Animation & Interaction Preferences
- **Animation style:** [Subtle / Prominent / Minimal]
- **Scroll effects:** [Fade-in / Slide-in / Parallax / None]
- **Hover states:** [Color change / Scale / Underline / Shadow]
- **Page transitions:** [None / Fade / Slide]
- **Loading states:** [Skeleton screens / Spinners / Progress bars]

### Dark Mode
- [ ] **Enabled** - Full dark mode support
- [ ] **Disabled** - Light mode only
- [ ] **System preference** - Follow OS setting
- **Default:** [Light / Dark / System]

### Responsive Breakpoints
Using Tailwind defaults:
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px
- **Special considerations:** [Any specific mobile/tablet requirements]

## Development Notes

### Browser Support
- **Modern browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile:** iOS Safari 12+, Chrome Android
- **Legacy support:** [IE11 / No legacy support required]

## Deployment

### Build Settings
```bash
Build command: npm run build
Publish directory: _site
Node version: 18.x
```

### Custom Domain
- **Domain:** [www.example.com]
- **SSL:** [Automatic / Manual certificate]
- **DNS Provider:** [Cloudflare / Domain registrar]
- **Redirects needed:** [List any URL redirects from old site]

### Deployment Checklist
Before going live:
- [ ] All content reviewed and approved by client
- [ ] Images optimized and alt text added
- [ ] Forms tested and emails received
- [ ] Analytics tracking verified
- [ ] Meta tags and SEO reviewed
- [ ] All links working (internal and external)
- [ ] Mobile responsiveness tested
- [ ] Browser compatibility tested
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] SSL certificate active
- [ ] 404 page customized
- [ ] Favicon and app icons set
- [ ] Social media preview images working
- [ ] Client final approval received

## Maintenance & Updates

### Content Update Process
**Who updates content:** [Client / Developer / Content team]  
**Update frequency:** [As needed / Monthly review]  
**Process:** [Direct file edit / CMS / Email requests]

### Blog Management
**Author:** [Name/email]  
**Review process:** [Draft → Review → Publish]  
**Publishing schedule:** [Day/time if regular]

## Notes & Special Requirements

### Legal/Compliance
- [ ] Cookie consent banner required (GDPR/CCPA)
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Accessibility statement
- **Jurisdiction:** [EU / California / Other regions with specific requirements]

### Known Issues or Limitations
[Document any compromises, browser-specific issues, or future enhancements]
- [Issue 1]: [Description and workaround if any]
- [Issue 2]: [Description and status]

### Future Enhancements
[Features requested but not in initial scope]
- [ ] [Feature 1] - [Priority: High/Medium/Low]
- [ ] [Feature 2] - [Priority: High/Medium/Low]
- [ ] [Feature 3] - [Priority: High/Medium/Low]

---

**Last Updated:** [Date]  
**Updated By:** [Name]  
**Version:** [1.0]