# Contributing to CyberGauntlet

Thank you for your interest in contributing to CyberGauntlet! This document provides guidelines for contributors. Please read the [README.md](README.md) for an overview of the project.

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/CyberGauntlet.git
   cd CyberGauntlet
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Adding Challenges

Challenges are stored in `public/challenges/`. To add a new challenge:

1. Create a new folder under `public/challenges/` (e.g., `q5/`).
2. Add the necessary files:
   - `hint.txt`: Concise hints or instructions.
   - `assets/`: Encrypted files, ciphertext, images, etc.
   - `README.md` (optional): Description and flag format.
3. Ensure assets are downloadable and hints are clear.
4. Test locally by accessing the challenge page.

Refer to the [Challenge Layout](#challenge-layout) section in README.md for more details.

## Frontend Development and UI Improvements

CyberGauntlet uses React + TypeScript with Tailwind CSS for styling. The UI features a modern, cyberpunk-inspired design with dark themes and animations.

### Landing Page

The landing page (`src/components/LandingPage.tsx`) serves as the entry point for users, showcasing the platform's features in a 2025-style design:

- **Hero Section**: Glitch-effect title, description, and call-to-action button.
- **Features Grid**: Highlights key platform features with hover effects.
- **How It Works**: Step-by-step guide to using the platform.
- **Modern Styling**: Gradient backgrounds, animations, and responsive design.

To contribute to the landing page:
- Enhance animations or add new sections.
- Improve accessibility and responsiveness.
- Update content or styling to match new features.

### Improving the UI

- Use Tailwind CSS classes for consistent styling.
- Leverage existing components like `GlitchText` and `TerminalBox` for thematic elements.
- Ensure components are responsive and work on mobile devices.
- Follow TypeScript best practices for type safety.

## Coding Standards

- Use TypeScript for all new code.
- Follow the existing code style and structure.
- Run linting before committing:
  ```bash
  npm run lint
  ```
- Ensure type checking passes:
  ```bash
  npm run type-check
  ```

## Testing

- Add unit tests for new features where applicable.
- Run tests before submitting:
  ```bash
  npm test
  ```

## Submitting Changes

1. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a pull request on the main repository.

## Security and Best Practices

- Do not commit secrets, API keys, or credentials.
- For server-side features, ensure proper validation and rate limiting.

## Contact

If you have questions or need help, open an issue on GitHub or contact the maintainers.

Happy contributing!