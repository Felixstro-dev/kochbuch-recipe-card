/**
 * Recipe Card for Home Assistant Lovelace
 * Integrates with the kochbuch backend API
 * Shows recipes with multiple views and shopping list functionality
 */

(async () => {
  'use strict';

  // Only register the elements once, even if the resource is loaded twice.
  if (!customElements.get('ha-recipe-card')) {
    // Create the card if it doesn't exist
    const style = document.createElement('style');
    style.textContent = `
      ha-recipe-card {
        --card-background-color: var(--background-color, #1e1e2f);
        --card-header-background-color: var(--primary-color, #e6a15c);
        --card-text-color: var(--on-primary-variable, #fff);
        --card-border-radius: 12px;
        --card-padding: 16px;
      }
      .recipe-image {
        width: 100%;
        height: 180px;
        border-radius: 8px;
        object-fit: cover;
        margin-bottom: 12px;
      }
      .recipe-title {
        font-size: 20px;
        font-weight: 500;
        margin: 8px 0;
      }
      .recipe-meta {
        color: var(--secondary-text-color, #aaa);
        font-size: 12px;
        margin-bottom: 12px;
      }
      .view-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }
      .view-tab {
        flex: 1;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--divider-color, #444);
        color: var(--secondary-text-color, #aaa);
        font-size: 11px;
        font-weight: 500;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .view-tab.active {
        background-color: var(--primary-color, #e6a15c);
        color: var(--paper-item-activated-color-bg, #1e1e2f);
        border-color: var(--primary-color, #e6a15c);
      }
      .view-tab:hover:not(.active) {
        background-color: rgba(255,255,255,0.1);
      }
      .ingredients-list {
        margin: 12px 0;
      }
      .ingredient-row {
        display: flex;
        align-items: baseline;
        margin: 4px 0;
        font-size: 13px;
      }
      .ingredient-unit {
        color: var(--secondary-text-color, #aaa);
        margin-left: 4px;
      }
      .shopping-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        background-color: var(--primary-color, #e6a15c);
        color: var(--on-primary-variable, #1e1e2f);
        border: none;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        margin-top: 8px;
      }
      .shopping-btn:hover {
        background-color: #d4904a;
      }
      .shopping-btn.disabled {
        background-color: var(--disabled-color, #666);
        color: var(--on-surface-variant, #eee);
        cursor: not-allowed;
      }
      .steps-list {
        margin: 12px 0;
      }
      .step-item {
        padding: 8px 0;
        border-bottom: 1px solid var(--divider-color, #444);
        font-size: 13px;
      }
      .error-msg {
        color: var(--error-color, #f44336);
        margin: 8px 0;
        font-size: 12px;
      }
      .hint {
        color: var(--secondary-text-color, #aaa);
        font-size: 12px;
        line-height: 1.5;
      }
      .loading {
        padding: 20px;
        text-align: center;
        color: var(--secondary-text-color, #aaa);
        font-size: 13px;
      }
      code {
        background: var(--secondary-background-color, #333);
        padding: 1px 4px;
        border-radius: 4px;
      }
    `;
    document.head.appendChild(style);

    // Create the card component
    class HaRecipeCard extends HTMLElement {
      setConfig(config) {
        this._config = config || {};
        this._recipes = [];
        this._detail = null;
        this._index = 0;
        // Support both snake_case (YAML) and camelCase
        this._currentView =
          this._config.mode || this._config.view || 'ideas';
        this._shoppingList = new Set();
        if (this._config.show_shopping_list === false) {
          this._shoppingListEnabled = false;
        } else {
          this._shoppingListEnabled = true;
        }
        this._searchQuery =
          this._config.search_query || this._config.query || 'Backen';
        this._filterWebOnly =
          this._config.filter_web_only !== undefined
            ? this._config.filter_web_only
            : this._config.filterWebOnly === true;
        this._baseUrl = (this._config.base_url || this._config.baseUrl || '').replace(/\/$/, '');
        this._apiKey = this._config.api_key || this._config.apiKey || '';
        this._limit = this._config.limit || 50;
        this._fetchRecipes();
      }

      getConfig() {
        return this._config;
      }

      _headers() {
        return this._apiKey ? { 'X-API-Key': this._apiKey } : {};
      }

      async _fetchRecipes() {
        if (!this._baseUrl) {
          this.innerHTML = `<div class="error-msg">Bitte <code>base_url</code> setzen, z. B. <code>http://192.168.30.9:8000</code>.</div>`;
          return;
        }
        this.innerHTML = '<div class="loading">Rezepte werden geladen …</div>';
        try {
          const url = `${this._baseUrl}/api/v1/search?q=${encodeURIComponent(
            this._searchQuery
          )}&limit=${this._limit}`;
          const response = await fetch(url, {
            credentials: 'omit',
            headers: this._headers(),
          });
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error(
                'Backend erreichbar, aber keine Freigabe. Setze EMBED_PUBLIC=true im Backend oder einen api_key.'
              );
            }
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();

          // Filter to only web recipes if configured
          const allRecipes = data.items || [];
          this._recipes = this._filterWebOnly
            ? allRecipes.filter((r) => r.source === 'web')
            : allRecipes;

          await this._loadDetail();
          this._render();
        } catch (err) {
          console.error('Error fetching recipes:', err);
          const hint = /Failed to fetch|NetworkError/i.test(err.message)
            ? `<div class="hint">Backend unter <code>${this._baseUrl}</code> nicht erreichbar. Prüfe, ob es auf <code>0.0.0.0</code> lauscht und die IP stimmt.</div>`
            : '';
          this.innerHTML = `<div class="error-msg">Fehler beim Laden der Rezepte: ${err.message}</div>${hint}`;
        }
      }

      async _loadDetail() {
        this._detail = null;
        const summary = this._recipes[this._index];
        if (!summary || !summary.cache_key) return;
        try {
          const response = await fetch(
            `${this._baseUrl}/api/v1/recipes/${encodeURIComponent(summary.cache_key)}`,
            { credentials: 'omit', headers: this._headers() }
          );
          if (!response.ok) return;
          const detail = await response.json();
          this._detail = this._adapt(detail);
        } catch {
          // Detail is optional – the summary still renders.
        }
      }

      _adapt(detail) {
        const ingredients = [];
        for (const group of detail.ingredient_groups || []) {
          for (const item of group.items || []) {
            ingredients.push(item);
          }
        }
        return {
          ...detail,
          ingredients,
          categories: detail.categories || (detail.category ? [detail.category] : []),
          tags: detail.tags || [],
        };
      }

      _imageUrl(recipe) {
        const raw = recipe.image_url || '';
        if (!raw) return '';
        return raw.startsWith('http') ? raw : `${this._baseUrl}${raw}`;
      }

      _recipe() {
        return this._detail || this._recipes[this._index] || {};
      }

      _render() {
        if (this._recipes.length === 0) {
          this.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--secondary-text-color, #aaa)">
              Keine Rezepte gefunden. Ändern Sie die Suchkriterien.
            </div>
          `;
          return;
        }

        // Show the selected recipe (default: first result)
        const recipe = this._recipe();
        
        // View tabs
        const tabs = ['ideas', 'full', 'next-step', 'inspiration']
          .map(view => `<div class="view-tab ${this._currentView === view ? 'active' : ''}" data-view="${view}">${this._getViewLabel(view)}</div>`)
          .join('');

        // Render based on current view
        let content;
        switch (this._currentView) {
          case 'ideas':
            content = this._renderIdeasView(recipe);
            break;
          case 'full':
            content = this._renderFullView(recipe);
            break;
          case 'next-step':
            content = this._renderNextStepView(recipe);
            break;
          case 'inspiration':
            content = this._renderInspirationView(recipe);
            break;
        }

        this.innerHTML = `
          <div style="background-color: var(--card-background-color, #1e1e2f); color: var(--card-text-color, #fff); padding: var(--card-padding, 16px); border-radius: var(--card-border-radius, 12px);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <div class="recipe-title" style="font-size: 20px; font-weight: 500;">${recipe.title || 'Unbenanntes Rezept'}</div>
                <div class="recipe-meta">${recipe.subtitle || ''} • ${recipe.rating ? `${recipe.rating}⭐` : ''}</div>
              </div>
              <div style="font-size: 12px; color: var(--secondary-text-color, #aaa)">${recipe.source_label || ''}</div>
            </div>
            <div class="view-tabs">${tabs}</div>
            
            ${content}
            
            ${this._shoppingListEnabled ? this._renderShoppingButton(recipe) : ''}
          </div>
        `;

        // Add click handlers for view tabs
        this.querySelectorAll('.view-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            this._currentView = tab.dataset.view;
            this._render();
          });
        });

        // Add shopping list button handler
        this.querySelector('.shopping-btn')?.addEventListener('click', () => {
          this._toggleShoppingList(recipe);
        });
      }

      _getViewLabel(view) {
        const labels = {
          ideas: 'Ideen',
          full: 'Vollständige WebUI',
          'next-step': 'Nächster Schritt',
          inspiration: 'Inspiration'
        };
        return labels[view] || view;
      }

      _renderIdeasView(recipe) {
        const ingredients = recipe.ingredients || [];
        const categories = recipe.categories || [];
        const tags = recipe.tags || [];

        let html = `
          <div class="ingredients-list">
            ${ingredients.length > 0 ? `
              <div style="margin-bottom: 8px;"><strong>Zutaten:</strong></div>
              ${ingredients.map((ing, i) => `
                <div class="ingredient-row">
                  <span style="flex: 1;">${ing.name || 'Zutat'}</span>
                  <span class="ingredient-unit">${ing.unit || ''}</span>
                  ${ing.amount !== undefined && ing.amount !== null ? `<span>${ing.amount}${ing.amount > 1 ? ' ' + (ing.unit || '') : ''}</span>` : ''}
                </div>
              `).join('')}
            ` : ''}
            
            ${categories.length > 0 ? `
              <div style="margin: 8px 0;"><strong>Kategorie:</strong> ${categories.join(', ')}</div>
            ` : ''}
            
            ${tags.length > 0 ? `
              <div style="margin: 8px 0;"><strong>Schlagwörter:</strong> ${tags.join(', ')}</div>
            ` : ''}
          </div>
        `;

        // Add description if available
        if (recipe.description) {
          html += `<div style="margin: 12px 0; line-height: 1.5;">${recipe.description}</div>`;
        }

        // Add steps summary
        const steps = recipe.steps || [];
        if (steps.length > 0) {
          html += `
            <div style="margin-top: 12px;">
              <div style="font-size: 12px; color: var(--secondary-text-color, #aaa); margin-bottom: 4px;">Schritte (${steps.length}):</div>
              ${steps.slice(0, 3).map((step, i) => `<div class="step-item">${step.text || 'Schritt ${i + 1}'}</div>`).join('')}
              ${steps.length > 3 ? `<div style="font-size: 11px; color: var(--secondary-text-color, #aaa);">... und ${steps.length - 3} weitere Schritte</div>` : ''}
            </div>
          `;
        }

        return html;
      }

      _renderFullView(recipe) {
        // Show image if available
        let html = '';
        const imageUrl = this._imageUrl(recipe);
        if (imageUrl) {
          html += `<img class="recipe-image" src="${imageUrl}" alt="${recipe.title || 'Rezept'}" loading="lazy">`;
        }

        // Description
        if (recipe.description) {
          html += `<div style="margin: 12px 0; line-height: 1.5;">${recipe.description}</div>`;
        }

        // Ingredients
        const ingredients = recipe.ingredients || [];
        if (ingredients.length > 0) {
          html += `<div style="margin: 12px 0;"><strong>Zutaten:</strong></div>
            ${ingredients.map((ing, i) => `
              <div style="margin: 4px 0; font-size: 13px;">
                ${ing.name || 'Zutat'}${ing.amount !== undefined && ing.amount !== null ? ` ${ing.amount}${ing.unit || ''}` : ''}
              </div>
            `).join('')}
          `;
        }

        // Steps
        const steps = recipe.steps || [];
        if (steps.length > 0) {
          html += `<div style="margin-top: 12px;">
            <div style="font-size: 12px; color: var(--secondary-text-color, #aaa); margin-bottom: 4px;">Zubereitung:</div>
            ${steps.map((step, i) => `<div class="step-item">${step.text || 'Schritt ${i + 1}'}</div>`).join('')}
          </div>`;
        }

        // Rating and info
        html += `<div style="margin-top: 12px; font-size: 12px; color: var(--secondary-text-color, #aaa);">
          ${recipe.rating_count ? `${recipe.rating_count} Bewertungen` : ''} ${recipe.base_servings ? `(${recipe.base_servings} Portionen)` : ''}
        </div>`;

        return html;
      }

      _renderNextStepView(recipe) {
        // Show only the first step or "next step" information
        const steps = recipe.steps || [];
        
        let html = `<div style="font-size: 13px; line-height: 1.6;">`;
        
        if (steps.length > 0) {
          // Show first step as "next step"
          html += `<div style="font-weight: 500; margin-bottom: 8px;">Nächster Schritt:</div>
            <div class="step-item">${steps[0].text || 'Schritt 1 starten'}</div>`;
          
          // Show estimated time if available
          if (recipe.total_min) {
            const hours = Math.floor(recipe.total_min / 60);
            const mins = recipe.total_min % 60;
            html += `<div style="font-size: 11px; color: var(--secondary-text-color, #aaa); margin-top: 4px;">
              Geschätzte Zeit: ${hours > 0 ? `${hours}h ` : ''}${mins > 0 ? `${mins}min` : ''}
            </div>`;
          }
        } else {
          html += 'Keine Schritte verfügbar';
        }
        
        html += `</div>`;

        // Add quick info
        html += `<div style="margin-top: 12px; font-size: 12px; color: var(--secondary-text-color, #aaa);">
          ${recipe.total_min ? `Gesamtzeit: ${recipe.total_min}min` : ''} ${recipe.base_servings ? `Portionen: ${recipe.base_servings}` : ''}
        </div>`;

        return html;
      }

      _renderInspirationView(recipe) {
        // Show inspirational aspects: title, image, categories, tags, rating
        let html = '';

        // Image
        const imageUrl = this._imageUrl(recipe);
        if (imageUrl) {
          html += `<img class="recipe-image" src="${imageUrl}" alt="${recipe.title || 'Rezept'}" loading="lazy">`;
        }

        // Title and rating
        html += `<div style="padding: 8px 0;">
          <div class="recipe-title" style="font-size: 18px;">${recipe.title || 'Unbenannt'}</div>
          ${recipe.rating ? `<div style="font-size: 16px; color: #ffd700;">★${recipe.rating}</div>` : ''}
        </div>`;

        // Categories and tags
        const categories = recipe.categories || [];
        const tags = recipe.tags || [];
        
        if (categories.length > 0 || tags.length > 0) {
          const categoryText = categories.length > 0 ? `Kategorie: ${categories.join(', ')}` : '';
          const tagText = tags.length > 0 ? `Schlagwörter: ${tags.join(', ')}` : '';
          const sep = categoryText && tagText ? ' | ' : '';
          html += `<div style="margin: 8px 0; font-size: 12px; color: var(--secondary-text-color, #aaa);">
            ${categoryText}${sep}${tagText}
          </div>`;
        }

        // Favorite status
        html += `<div style="margin-top: 8px; font-size: 11px; color: var(--secondary-text-color, #aaa);">
          ${recipe.is_favorite ? '⭐ Als Favorit markiert' : 'Als Favorit markieren'}
        </div>`;

        return html;
      }

      _renderShoppingButton(recipe) {
        const ingredientRows = (recipe.ingredients || []).map(ing => ing.name).filter(Boolean);
        const hasIngredients = ingredientRows.length > 0;
        
        const isInShoppingList = this._shoppingList.has(recipe.cache_key || recipe.id || '');
        
        return `
          <button class="shopping-btn ${isInShoppingList ? 'disabled' : ''}" title="Warenkorb hinzufügen / entfernen">
            ${isInShoppingList ? 'Entfernt' : 'Warenkorb'}
            ${!isInShoppingList ? `<span style="color: var(--on-primary-variable, #1e1e2f);">(${ingredientRows.length} Zutaten)</span>` : ''}
          </button>
        `;
      }

      _toggleShoppingList(recipe) {
        const key = recipe.cache_key || recipe.id || '';
        
        if (this._shoppingList.has(key)) {
          this._shoppingList.delete(key);
        } else {
          this._shoppingList.add(key);
        }
        
        this._render();
        
        // Dispatch event so parent can handle it
        this.dispatchEvent(new CustomEvent('recipe-shopping-list-changed', {
          detail: { recipe, added: this._shoppingList.has(key) }
        }));
      }
    }

    // Visual editor shown in the Lovelace "Add card" / edit dialog
    class HaRecipeCardEditor extends HTMLElement {
      set hass(hass) {
        this._hass = hass;
      }

      setConfig(config) {
        this._config = Object.assign(
          {
            base_url: '',
            search_query: 'Backen',
            mode: 'ideas',
            limit: 10,
            filter_web_only: false,
            show_shopping_list: true,
            api_key: ''
          },
          config || {}
        );
        this._render();
      }

      _field(label, key, type, extra) {
        const value = this._config[key];
        if (type === 'checkbox') {
          return `<label class="row check">
            <input type="checkbox" data-key="${key}" ${value ? 'checked' : ''}>
            <span>${label}</span>
          </label>`;
        }
        if (type === 'select') {
          const options = [
            ['ideas', 'Ideen'],
            ['full', 'Vollständige WebUI'],
            ['next-step', 'Nächster Schritt'],
            ['inspiration', 'Inspiration']
          ]
            .map(
              ([val, text]) =>
                `<option value="${val}" ${value === val ? 'selected' : ''}>${text}</option>`
            )
            .join('');
          return `<label class="row"><span>${label}</span>
            <select data-key="${key}">${options}</select></label>`;
        }
        return `<label class="row"><span>${label}</span>
          <input type="${type}" data-key="${key}" value="${value ?? ''}"
            ${extra || ''}></label>`;
      }

      _render() {
        this.innerHTML = `
          <style>
            .editor { display: flex; flex-direction: column; gap: 12px; padding: 4px; }
            .row { display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: 10px; }
            .row > span { font-size: 14px; color: var(--primary-text-color); }
            .row.check { grid-template-columns: auto 1fr; }
            input[type='text'], input[type='password'], input[type='number'], select {
              width: 100%; box-sizing: border-box; padding: 8px 10px;
              border: 1px solid var(--divider-color, #ccc); border-radius: 6px;
              background: var(--card-background-color, #fff);
              color: var(--primary-text-color, #000); font-size: 14px;
            }
            .note { font-size: 12px; color: var(--secondary-text-color); line-height: 1.5; }
            code { background: var(--secondary-background-color, #eee); padding: 1px 4px; border-radius: 4px; }
            @media (max-width: 600px) { .row { grid-template-columns: 1fr; gap: 4px; } }
          </style>
          <div class="editor">
            ${this._field('Backend-URL', 'base_url', 'text', 'placeholder="http://192.168.30.9:8000"')}
            ${this._field('Suchbegriff', 'search_query', 'text', 'placeholder="Backen"')}
            ${this._field('Ansicht', 'mode', 'select')}
            ${this._field('Max. Rezepte', 'limit', 'number', 'min="1" max="50"')}
            ${this._field('Nur Web-Rezepte', 'filter_web_only', 'checkbox')}
            ${this._field('Einkaufsliste-Button', 'show_shopping_list', 'checkbox')}
            ${this._field('API-Key (optional)', 'api_key', 'password', 'placeholder="leer lassen, wenn EMBED_PUBLIC aktiv ist"')}
            <p class="note">
              Die Backend-URL ist die Adresse des Rechners, auf dem das Kochbuch-Backend läuft
              (Port <code>8000</code>), nicht die von Home Assistant.
            </p>
          </div>
        `;

        this.querySelectorAll('[data-key]').forEach((element) => {
          element.addEventListener('input', () => this._changed(element));
          element.addEventListener('change', () => this._changed(element));
        });
      }

      _changed(element) {
        const key = element.dataset.key;
        let value =
          element.type === 'checkbox' ? element.checked : element.value;
        if (element.type === 'number') value = Number(value) || 1;
        this._config = Object.assign({}, this._config, { [key]: value });
        this.dispatchEvent(
          new CustomEvent('config-changed', {
            detail: { config: this._config },
            bubbles: true,
            composed: true
          })
        );
      }
    }

    customElements.define('ha-recipe-card-editor', HaRecipeCardEditor);
    customElements.define('ha-recipe-card', HaRecipeCard);

    HaRecipeCard.getConfigElement = async function () {
      return document.createElement('ha-recipe-card-editor');
    };

    HaRecipeCard.getStubConfig = function () {
      return {
        base_url: 'http://192.168.30.9:8000',
        mode: 'ideas',
        search_query: 'Backen',
        limit: 10,
        filter_web_only: false,
        show_shopping_list: true
      };
    };

    // Register the card in the Lovelace "Add card" picker
    window.customCards = window.customCards || [];
    if (!window.customCards.some((entry) => entry && entry.type === 'ha-recipe-card')) {
      window.customCards.push({
        type: 'ha-recipe-card',
        name: 'Kochbuch Recipe Card',
        description:
          'Rezepte aus dem Kochbuch-Backend mit Ideen-, Voll-, Nächster-Schritt- und Inspirations-Ansicht.',
        preview: true,
        documentationURL: 'https://github.com/Felixstro-dev/kochbuch-recipe-card'
      });
    }
  }
})();