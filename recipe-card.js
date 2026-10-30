/**
 * Recipe Card for Home Assistant Lovelace
 * Integrates with the kochbuch backend API
 * Shows recipes with multiple views and shopping list functionality
 */

(async () => {
  'use strict';

  // Card configuration
  const card = document.querySelector('ha-recipe-card');
  if (!card) {
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
    `;
    document.head.appendChild(style);

    // Create the card component
    class HaRecipeCard extends HTMLElement {
      setConfig(config) {
        this._config = config;
        this._recipes = [];
        this._currentView = 'ideas'; // ideas, full, next-step, inspiration
        this._shoppingList = new Set();
        this._fetchRecipes();
      }

      getConfig() {
        return this._config;
      }

      async _fetchRecipes() {
        try {
          const response = await fetch(
            `/api/v1/search?q=${encodeURIComponent(this._config.query || '')}&limit=50`
          );
          if (!response.ok) throw new Error('Network error');
          const data = await response.json();
          
          // Filter to only web recipes if configured
          const allRecipes = data.items || [];
          this._recipes = this._config.filterWebOnly
            ? allRecipes.filter(r => r.source === 'web')
            : allRecipes;
          
          this._render();
        } catch (err) {
          console.error('Error fetching recipes:', err);
          this.innerHTML = `<div class="error-msg">Fehler beim Laden der Rezepte: ${err.message}</div>`;
        }
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

        // Select first recipe or allow cycling
        const recipe = this._recipes[0];
        
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
              <div style="font-size: 12px; color: var(--secondary-text-color, #aaa)">#${recipe.id || '?'}</div>
            </div>
            <div class="view-tabs">${tabs}</div>
            
            ${content}
            
            ${this._renderShoppingButton(recipe)}
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
          next-step: 'Nächster Schritt',
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
        if (recipe.image_source_url) {
          html += `<img class="recipe-image" src="${recipe.image_source_url}" alt="${recipe.title || 'Rezept'}">`;
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
        if (recipe.image_source_url) {
          html += `<img class="recipe-image" src="${recipe.image_source_url}" alt="${recipe.title || 'Rezept'}">`;
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
          html += `<div style="margin: 8px 0; font-size: 12px; color: var(--secondary-text-color, #aaa);">
            ${categories.length > 0 ? `Kategorie: ${categories.join(', ')}` : ''}
            ${tags.length > 0 ? ${categories.length > 0 ? ' | ' : ''}Schlagwörter: ${tags.join(', ')} : ''}
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

    customElements.define('ha-recipe-card', HaRecipeCard);
    
    // Notify HA that config has been processed
    if (window.customCards) {
      window.customCards = window.customCards || [];
      window.customCards.push('ha-recipe-card');
    }
  }
})();