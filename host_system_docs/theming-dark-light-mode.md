# Dark/Light Mode Theming Implementation Guide

## Overview

This document comprehensively describes how dark/light mode theming works in the BrainDrive codebase. The system uses a combination of a centralized ThemeService, React Context providers, CSS classes, and CSS variables to manage theme switching across the entire application.

## 1. Theme State Management Architecture

### 1.1 ThemeService (Singleton Pattern)

Location: frontend/src/services/themeService.ts

The ThemeService is the central service responsible for managing theme state globally. It implements the singleton pattern and is accessed throughout the application.

Key Features:
- Maintains current theme state ('light' or 'dark')
- Manages theme change listeners for reactive updates
- Applies theme to DOM via CSS classes
- Provides methods for getting, setting, and toggling themes

Core Methods:
```
getCurrentTheme(): Theme  // Returns 'light' | 'dark'
setTheme(theme: Theme): void
toggleTheme(): void
addThemeChangeListener(listener: ThemeChangeListener): void
removeThemeChangeListener(listener: ThemeChangeListener): void
```

### 1.2 Service Registration

Location: frontend/src/App.tsx

The themeService is registered in the ServiceRegistry and initialized through the ServiceProvider.

### 1.3 Service Context Hook

Location: frontend/src/contexts/ServiceContext.tsx

The theme service is accessed via a custom hook: useTheme()

## 2. CSS Classes and Styling Approach

### 2.1 Class-Based Theme Application

The primary approach uses CSS classes applied to the DOM root:
- .dark - Applied to document.documentElement when dark mode is active
- .dark-theme - Applied to specific component containers
- .dark-scrollbars - Applied to body for dark scrollbar styling

### 2.2 Light Theme Variables

Light theme is the default and uses CSS variables defined at the root level in :root selector.

### 2.3 Dark Theme Variables

Dark theme overrides CSS variables when the .dark-theme class is applied.

## 3. How Components Apply Dark Mode Styles

### 3.1 Class-Based Components Pattern

1. Initialize theme service in componentDidMount
2. Subscribe to theme change listeners
3. Store theme in component state
4. Apply "dark-theme" class conditionally based on state
5. Use CSS variables for all colors

Example:
```
const themeClass = this.state.currentTheme === 'dark' ? 'dark-theme' : '';
return <div className={`component ${themeClass}`}>...</div>
```

### 3.2 Using CSS Variables

Use CSS variables instead of hardcoded colors:
```css
.my-component {
  background-color: var(--bg-color);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}
```

### 3.3 Component-Specific Overrides

For dark mode specific styling:
```css
.dark-theme .my-button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

## 4. Dark Mode Naming Conventions

### 4.1 CSS Class Names
- .dark - Global indicator
- .dark-theme - Component-level indicator
- .dark-scrollbars - Body element indicator

### 4.2 CSS Variable Naming
Variables follow pattern: --[category]-[property]
Examples:
- --bg-color
- --text-color
- --border-color
- --button-primary-bg
- --shadow-md
- --status-success-color

## 5. Key Implementation Files

Frontend:
- frontend/src/services/themeService.ts - Central theme service
- frontend/src/contexts/ServiceContext.tsx - Theme service access
- frontend/src/App.tsx - Service registration
- frontend/src/components/ThemeSelector.tsx - Theme toggle UI
- frontend/src/index.css - Global styles

Plugins:
- backend/plugins/shared/BrainDriveChat/v1.0.21/src/BrainDriveChat.tsx - Chat component
- backend/plugins/shared/BrainDriveChat/v1.0.21/src/styles/BrainDriveChat.base.css - Base variables
- backend/plugins/shared/BrainDriveChat/v1.0.21/src/styles/BrainDriveChat.themes.css - Dark mode
- backend/plugins/shared/BrainDriveSettings/v1.0.7/src/ComponentTheme.tsx - Settings component

## 6. Step-by-Step: Add Dark Mode to New Plugin

Step 1: Create CSS file structure
```
src/
  styles/
    MyPlugin.base.css
    MyPlugin.themes.css
    MyPlugin.css
  MyPlugin.tsx
```

Step 2: Define CSS variables in base file
Light theme variables in :root selector

Step 3: Override variables for dark theme
Dark theme variable overrides in .dark-theme selector

Step 4: Import CSS files
Main MyPlugin.css imports base and themes files

Step 5: Initialize theme in React component
```typescript
componentDidMount() {
  if (this.props.services?.theme) {
    const currentTheme = this.props.services.theme.getCurrentTheme();
    this.setState({ currentTheme });
    
    this.themeChangeListener = (newTheme: string) => {
      this.setState({ currentTheme: newTheme });
    };
    
    this.props.services.theme.addThemeChangeListener(this.themeChangeListener);
  }
}
```

Step 6: Apply theme class in render
```typescript
const themeClass = this.state.currentTheme === 'dark' ? 'dark-theme' : '';
return <div className={`container ${themeClass}`}>...</div>
```

Step 7: Use CSS variables in styles
All colors use var() not hardcoded values

## 7. Color Palette Reference

Light Theme:
- --primary-bg: #ffffff
- --secondary-bg: #f5f5f5
- --primary-text: #333333
- --secondary-text: #666666
- --border-color: rgba(0, 0, 0, 0.12)
- --accent-color: #2196f3

Dark Theme:
- --primary-bg: #121a28
- --secondary-bg: #1a2332
- --primary-text: #e0e0e0
- --secondary-text: #b0b0b0
- --border-color: rgba(255, 255, 255, 0.1)
- --accent-color: #2196f3

## 8. Best Practices

1. Always use CSS variables for colors and shadows
2. Apply .dark-theme class to root component container
3. Subscribe to theme changes in componentDidMount()
4. Unsubscribe in componentWillUnmount()
5. Store theme state in component state
6. Update on listener callbacks
7. Use consistent color palette across plugins
8. Organize CSS modularly (base, layout, components, themes)
9. Test both light and dark modes
10. Avoid hardcoded colors

## 9. Debugging

Check current theme:
```typescript
console.log('Current theme:', themeService.getCurrentTheme());
```

Verify DOM classes:
```javascript
document.documentElement.classList  // Should contain 'dark'
document.body.classList             // Should contain 'dark-scrollbars'
```

Test CSS variables:
```javascript
getComputedStyle(document.documentElement).getPropertyValue('--bg-color')
```

Common Issues:
- Theme not changing: Verify listener is registered, component re-renders
- Colors not updating: Check CSS uses var() not hardcoded values
- Class not applied: Verify themeClass added to component root
- Variables not defined: Check .dark-theme selector has all required variables
