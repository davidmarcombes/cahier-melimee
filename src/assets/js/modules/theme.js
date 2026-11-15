/* Theme toggle */
export function themeToggle() {
  return {
    dark: document.documentElement.classList.contains('dark'),
    toggle() {
      this.dark = !this.dark;
      document.documentElement.classList.toggle('dark', this.dark);
      try {
        localStorage.setItem('theme', this.dark ? 'dark' : 'light');
      } catch {
        /* storage blocked: the choice lasts for this page only */
      }
    },
  };
}
