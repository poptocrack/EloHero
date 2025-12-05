import type { Plugin } from 'vite';

/**
 * Vite plugin to inject preload hints for CSS and JS files
 * This allows resources to load in parallel, breaking the critical request chain
 */
export function preloadResources(): Plugin {
  return {
    name: 'preload-resources',
    transformIndexHtml: {
      enforce: 'post', // Run after Vite's built-in HTML plugin
      transform(html) {
        // Find all CSS links that Vite injects (more flexible regex)
        const cssRegex = /<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/g;
        // Find all JS module scripts that Vite injects
        const jsRegex = /<script[^>]+src=["']([^"']+\.js[^"']*)["'][^>]*>/g;
        
        const preloadLinks: string[] = [];
        const processedUrls = new Set<string>();
        let match;
        
        // Extract CSS files and create preload hints
        while ((match = cssRegex.exec(html)) !== null) {
          const href = match[1];
          // Only preload if it's a local asset (starts with / or ./)
          if ((href.startsWith('/') || href.startsWith('./')) && !processedUrls.has(href)) {
            preloadLinks.push(`<link rel="preload" href="${href}" as="style" />`);
            processedUrls.add(href);
          }
        }
        
        // Extract JS files and create preload hints
        while ((match = jsRegex.exec(html)) !== null) {
          const src = match[1];
          // Only preload if it's a local asset (starts with / or ./)
          if ((src.startsWith('/') || src.startsWith('./')) && !processedUrls.has(src)) {
            preloadLinks.push(`<link rel="preload" href="${src}" as="script" />`);
            processedUrls.add(src);
          }
        }
        
        // Insert preload hints right after the viewport meta tag (early in <head>)
        if (preloadLinks.length > 0) {
          const viewportIndex = html.indexOf('<meta name="viewport"');
          if (viewportIndex !== -1) {
            const insertIndex = html.indexOf('>', viewportIndex) + 1;
            const preloadHtml = '\n    <!-- Preload critical resources for parallel loading -->\n    ' + preloadLinks.join('\n    ') + '\n';
            return html.slice(0, insertIndex) + preloadHtml + html.slice(insertIndex);
          }
        }
        
        return html;
      }
    }
  };
}

