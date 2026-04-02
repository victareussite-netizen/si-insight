/**
 * MyCarto Preddict — Main Application Controller
 * 
 * Orchestre le moteur d'impact, le rendu graphique et l'interface utilisateur.
 */

class App {
    constructor() {
        this.engine = new ImpactEngine();
        this.renderer = new GraphRenderer();
        this.log = [];
        this.currentView = 'live';
        this.snapshotBefore = null; // Snapshot state for compare view
        this.connectMode = null; // {step, from}
    }

    // ==================== INIT ====================

    init() {
        // Init engine
        this.engine.init(SIData.applications, SIData.flows, SIData.processes);

        // Update UI (stats, processes, health — no graph dependency)
        this._updateStats();
        this._updateProcesses();
        this._updateHealth();

        // Bind events
        this._bindEvents();

        // Render initial graph AFTER layout is computed
        requestAnimationFrame(() => {
            this._renderLiveGraph();
        });

        // Show welcome toast
        setTimeout(() => {
            this.toast('Bienvenue dans MyCarto Preddict', 'info', '🚀');
        }, 800);
    }

    // ==================== EVENTS ====================

    _bindEvents() {
        // View toggle
        document.getElementById('btn-view-live').addEventListener('click', () => this.switchView('live'));
        document.getElementById('btn-view-compare').addEventListener('click', () => this.switchView('compare'));

        // Actions
        document.getElementById('btn-remove').addEventListener('click', () => this._handleRemove());
        document.getElementById('btn-add').addEventListener('click', () => this._handleAdd());
        document.getElementById('btn-migrate').addEventListener('click', () => this._handleMigrate());
        document.getElementById('btn-connect').addEventListener('click', () => this._handleConnect());
        document.getElementById('btn-reset').addEventListener('click', () => this._handleReset());
        document.getElementById('btn-undo').addEventListener('click', () => this._handleUndo());

        // Toolbar
        document.getElementById('btn-zoom-fit').addEventListener('click', () => this.renderer.fitView());
        document.getElementById('btn-physics').addEventListener('click', () => this._togglePhysics());

        // Scenarios
        document.querySelectorAll('.scenario-btn').forEach(btn => {
            btn.addEventListener('click', () => this._executeScenario(btn.dataset.scenario));
        });

        // Modal
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal-overlay')) this.closeModal();
        });

        // Close info panel
        document.getElementById('btn-close-info').addEventListener('click', () => {
            document.getElementById('panel-node-info').style.display = 'none';
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.connectMode = null;
                this._updateHint('Cliquez sur un nœud pour voir ses détails');
            }
            if (e.key === 'z' && e.ctrlKey) {
                e.preventDefault();
                this._handleUndo();
            }
        });
    }

    // ==================== VIEWS ====================

    switchView(view) {
        this.currentView = view;

        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        document.querySelectorAll('.graph-container').forEach(c => c.classList.remove('active'));

        if (view === 'live') {
            document.getElementById('graph-live').classList.add('active');
        } else {
            document.getElementById('graph-compare').classList.add('active');
            this._renderCompareView();
        }
    }

    // ==================== RENDERING ====================

    _renderLiveGraph() {
        const container = document.getElementById('network-live');
        this.renderer.renderLive(
            container,
            this.engine.currentApps,
            this.engine.currentFlows,
            (nodeId) => this._onNodeSelect(nodeId),
            () => this._onNodeDeselect()
        );
    }

    _updateLiveGraph(impactedIds = new Set(), removedIds = new Set(), addedIds = new Set()) {
        this.renderer.updateLive(
            this.engine.currentApps,
            this.engine.currentFlows,
            impactedIds,
            removedIds,
            addedIds
        );
    }

    _renderCompareView() {
        // Always compare original state vs current state
        const before = this.snapshotBefore 
            ? { apps: this.snapshotBefore.apps, flows: this.snapshotBefore.flows }
            : { apps: this.engine.originalApps, flows: this.engine.originalFlows };
        const after = { apps: this.engine.currentApps, flows: this.engine.currentFlows };

        const beforeIds = new Set(before.apps.map(a => a.id));
        const afterIds = new Set(after.apps.map(a => a.id));

        const removedIds = new Set([...beforeIds].filter(id => !afterIds.has(id)));
        const addedIds = new Set([...afterIds].filter(id => !beforeIds.has(id)));
        const impactedIds = new Set();

        // Find impacted (apps that lost or gained connections)
        after.apps.forEach(app => {
            const origFlowCount = before.flows.filter(f => f.from === app.id || f.to === app.id).length;
            const currFlowCount = after.flows.filter(f => f.from === app.id || f.to === app.id).length;
            if (currFlowCount !== origFlowCount && !addedIds.has(app.id)) {
                impactedIds.add(app.id);
            }
        });

        this.renderer.renderCompare(
            document.getElementById('network-before'),
            document.getElementById('network-after'),
            before.apps, before.flows,
            after.apps, after.flows,
            removedIds, addedIds, impactedIds
        );
    }

    // ==================== NODE SELECTION ====================

    _onNodeSelect(nodeId) {
        // Connect mode handling
        if (this.connectMode && this.connectMode.step === 'select-target') {
            if (this.connectMode.from === nodeId) {
                this.toast('Sélectionnez une application différente', 'warning', '⚠️');
                return;
            }
            this._completeConnect(this.connectMode.from, nodeId);
            return;
        }

        const app = this.engine.getApp(nodeId);
        if (!app) return;

        const deps = this.engine.getDirectDependencies(nodeId);
        const flows = this.engine.getFlowsForApp(nodeId);

        this._showNodeInfo(app, deps, flows);

        // Also show impact preview
        const impact = this.engine.analyzeRemoval(nodeId);
        if (impact) {
            this._showImpactPreview(impact);
        }
    }

    _onNodeDeselect() {
        if (this.connectMode) return;
        document.getElementById('panel-node-info').style.display = 'none';
        document.getElementById('panel-impact').style.display = 'none';
    }

    _showNodeInfo(app, deps, flows) {
        const panel = document.getElementById('panel-node-info');
        const content = document.getElementById('node-info-content');

        const critClass = `criticality-${app.criticality}`;
        const critLabel = app.criticality.charAt(0).toUpperCase() + app.criticality.slice(1);

        let depsHtml = deps.map(d => `
            <div class="dep-item">
                <span>${d.icon}</span>
                <span class="dep-arrow">→</span>
                <span>${d.shortName || d.name}</span>
            </div>
        `).join('');

        content.innerHTML = `
            <div class="node-info-header">
                <div class="node-info-icon" style="background:${app.color}22; border: 1px solid ${app.color}44;">
                    ${app.icon}
                </div>
                <div>
                    <div class="node-info-title">${app.name}</div>
                    <div class="node-info-type">${app.category}</div>
                </div>
            </div>
            <div class="node-info-meta">
                <div class="info-row">
                    <span class="info-label">Criticité</span>
                    <span class="criticality-badge ${critClass}">${critLabel}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Technologie</span>
                    <span class="info-value">${app.technology}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Responsable</span>
                    <span class="info-value">${app.owner}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Utilisateurs</span>
                    <span class="info-value">${app.users > 0 ? app.users.toLocaleString() : '-'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">SLA</span>
                    <span class="info-value">${app.sla}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Coût</span>
                    <span class="info-value">${app.cost}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Flux connectés</span>
                    <span class="info-value">${flows.length}</span>
                </div>
            </div>
            <p style="font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.5;">${app.description}</p>
            ${deps.length > 0 ? `
                <div class="node-deps">
                    <div class="node-deps-title">Dépendances directes (${deps.length})</div>
                    ${depsHtml}
                </div>
            ` : ''}
        `;

        panel.style.display = 'block';
    }

    _showImpactPreview(impact) {
        const panel = document.getElementById('panel-impact');
        const severityEl = document.getElementById('impact-severity');
        const contentEl = document.getElementById('impact-content');

        const severityConfig = {
            critical: { label: 'Critique', class: 'severity-critical' },
            high: { label: 'Élevé', class: 'severity-high' },
            medium: { label: 'Moyen', class: 'severity-medium' },
            low: { label: 'Faible', class: 'severity-low' }
        };

        const sev = severityConfig[impact.severity];
        severityEl.className = `impact-severity ${sev.class}`;
        severityEl.textContent = sev.label;

        // Score color
        const scoreColor = impact.score >= 75 ? '#FF4757' : impact.score >= 50 ? '#FFA502' : impact.score >= 25 ? '#1E90FF' : '#2ED573';

        // Affected flows
        const flowsHtml = impact.affectedFlows.slice(0, 8).map(f => `
            <div class="impact-item broken">
                <span class="impact-dot"></span>
                <span>${f.label} (${f.protocol})</span>
            </div>
        `).join('');

        // Processes
        const processesHtml = impact.affectedProcesses
            .filter(p => p.status !== 'ok')
            .map(p => `
                <div class="impact-item ${p.status}">
                    <span class="impact-dot"></span>
                    <span>${p.icon} ${p.name}</span>
                </div>
            `).join('');

        // Cascade deps
        const cascadeHtml = impact.cascadeDependencies.slice(0, 6).map(d => `
            <div class="impact-item degraded">
                <span class="impact-dot"></span>
                <span>${d.icon} ${d.shortName} <span style="color:var(--text-muted);font-size:10px">(niveau ${d.cascadeLevel})</span></span>
            </div>
        `).join('');

        contentEl.innerHTML = `
            <div class="impact-score">
                <div class="impact-score-value" style="color:${scoreColor}">${impact.score}</div>
                <div class="impact-score-label">Score d'impact / 100</div>
                <div class="impact-score-bar">
                    <div class="impact-score-fill" style="width:${impact.score}%;background:${scoreColor}"></div>
                </div>
            </div>

            <div class="impact-section">
                <div class="impact-section-title">
                    Flux interrompus
                    <span class="impact-section-count">${impact.affectedFlows.length}</span>
                </div>
                ${flowsHtml || '<div class="impact-item ok"><span class="impact-dot"></span><span>Aucun flux impacté</span></div>'}
            </div>

            <div class="impact-section">
                <div class="impact-section-title">
                    Processus affectés
                    <span class="impact-section-count">${impact.brokenProcessCount + impact.degradedProcessCount}</span>
                </div>
                ${processesHtml || '<div class="impact-item ok"><span class="impact-dot"></span><span>Tous les processus OK</span></div>'}
            </div>

            <div class="impact-section">
                <div class="impact-section-title">
                    Dépendances en cascade
                    <span class="impact-section-count">${impact.cascadeDependencies.length}</span>
                </div>
                ${cascadeHtml || '<div class="impact-item ok"><span class="impact-dot"></span><span>Aucune cascade</span></div>'}
            </div>

            ${impact.redundancies && impact.redundancies.length > 0 ? `
                <div class="impact-section" style="border-left:3px solid var(--info);padding-left:8px;">
                    <div class="impact-section-title">💡 Redondances possibles</div>
                    ${impact.redundancies.map(r => `
                        <div class="impact-item ok">
                            <span class="impact-dot"></span>
                            <span>${r.icon} ${r.name} pourrait compenser</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;

        panel.style.display = 'block';
    }

    // ==================== ACTIONS ====================

    _handleRemove() {
        const nodeId = this.renderer.getSelectedNodeId();
        if (!nodeId) {
            this.toast('Sélectionnez d\'abord une application sur le graphe', 'warning', '⚠️');
            return;
        }

        const app = this.engine.getApp(nodeId);
        if (!app) return;

        const impact = this.engine.analyzeRemoval(nodeId);

        this.openModal(
            `Supprimer ${app.name} ?`,
            `
                <div style="text-align:center;margin-bottom:16px;">
                    <div style="font-size:48px;margin-bottom:8px;">${app.icon}</div>
                    <div style="font-size:14px;font-weight:600;margin-bottom:4px;">${app.name}</div>
                    <span class="criticality-badge criticality-${app.criticality}">${app.criticality}</span>
                </div>
                <div style="background:var(--danger-bg);border:1px solid rgba(255,71,87,0.2);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px;">
                    <div style="font-size:13px;font-weight:600;color:var(--danger);margin-bottom:8px;">⚡ Impact estimé</div>
                    <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">
                        Score d'impact : <strong style="color:var(--danger)">${impact.score}/100</strong><br>
                        Flux interrompus : <strong>${impact.affectedFlows.length}</strong><br>
                        Processus cassés : <strong>${impact.brokenProcessCount}</strong><br>
                        Processus dégradés : <strong>${impact.degradedProcessCount}</strong><br>
                        Dépendances en cascade : <strong>${impact.cascadeDependencies.length}</strong>
                    </div>
                </div>
                <p style="font-size:12px;color:var(--text-muted);">Cette action supprimera l'application et tous ses flux associés. Vous pourrez annuler avec Ctrl+Z.</p>
            `,
            [
                { label: 'Annuler', class: 'btn-ghost', action: () => this.closeModal() },
                { label: 'Supprimer', class: 'btn-danger', action: () => this._executeRemoval(nodeId) }
            ]
        );
    }

    _executeRemoval(appId) {
        this.closeModal();

        // Take snapshot for compare
        this.snapshotBefore = {
            apps: JSON.parse(JSON.stringify(this.engine.currentApps)),
            flows: JSON.parse(JSON.stringify(this.engine.currentFlows))
        };

        const app = this.engine.getApp(appId);
        const impact = this.engine.analyzeRemoval(appId);

        // Get impacted app IDs before removal
        const impactedIds = new Set(impact.directDependencies.map(d => d.id));

        // Execute
        this.engine.executeRemoval(appId);

        // Update visualization
        this._updateLiveGraph(impactedIds);

        // Flash impacted nodes
        this.renderer.flashImpactedNodes(impactedIds);

        // Update all UI
        this._updateStats();
        this._updateProcesses();
        this._updateHealth();

        // Log
        this._addLog('remove', `<strong>${app.name}</strong> supprimé. ${impact.affectedFlows.length} flux interrompus, ${impact.brokenProcessCount} processus cassés.`);

        this.toast(`${app.name} supprimé du SI`, 'danger', '🗑️');

        // Hide node info
        document.getElementById('panel-node-info').style.display = 'none';
        document.getElementById('panel-impact').style.display = 'none';
    }

    _handleAdd() {
        const templatesHtml = SIData.appTemplates.map((tpl, i) => `
            <option value="${i}">${tpl.icon} ${tpl.name}</option>
        `).join('');

        const existingApps = this.engine.currentApps.map(a => `
            <option value="${a.id}">${a.icon} ${a.shortName || a.name}</option>
        `).join('');

        this.openModal(
            'Ajouter une application',
            `
                <div class="form-group">
                    <label class="form-label">Template</label>
                    <select class="form-select" id="add-template">
                        ${templatesHtml}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Nom personnalisé (optionnel)</label>
                    <input class="form-input" id="add-name" placeholder="Nom de l'application...">
                </div>
                <div class="form-group">
                    <label class="form-label">Criticité</label>
                    <select class="form-select" id="add-criticality">
                        <option value="standard">Standard</option>
                        <option value="important">Important</option>
                        <option value="critique">Critique</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Connecter à (flux entrant) - optionnel</label>
                    <select class="form-select" id="add-connect-from">
                        <option value="">— Aucun —</option>
                        ${existingApps}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Connecter vers (flux sortant) - optionnel</label>
                    <select class="form-select" id="add-connect-to">
                        <option value="">— Aucun —</option>
                        ${existingApps}
                    </select>
                </div>
            `,
            [
                { label: 'Annuler', class: 'btn-ghost', action: () => this.closeModal() },
                { label: 'Ajouter', class: 'btn-success', action: () => this._executeAdd() }
            ]
        );
    }

    _executeAdd() {
        const tplIdx = document.getElementById('add-template').value;
        const customName = document.getElementById('add-name').value.trim();
        const criticality = document.getElementById('add-criticality').value;
        const connectFrom = document.getElementById('add-connect-from').value;
        const connectTo = document.getElementById('add-connect-to').value;

        const tpl = SIData.appTemplates[tplIdx];
        const id = 'app_' + Date.now();

        const critColors = { critique: '#FF4757', important: '#FFA502', standard: '#2ED573' };

        const newApp = {
            id: id,
            name: customName || tpl.name,
            shortName: customName ? customName.substring(0, 8).toUpperCase() : tpl.name.split(' ')[0].toUpperCase(),
            type: tpl.type,
            category: tpl.category,
            criticality: criticality,
            icon: tpl.icon,
            color: critColors[criticality],
            description: `Application ajoutée : ${customName || tpl.name}`,
            owner: 'DSI',
            technology: 'Cloud',
            users: 0,
            sla: '99%',
            cost: 'N/A'
        };

        const newFlows = [];
        if (connectFrom) {
            newFlows.push({ from: connectFrom, to: id, label: 'Flux entrant', type: 'api', protocol: 'REST API', frequency: 'Temps réel', volume: 'N/A' });
        }
        if (connectTo) {
            newFlows.push({ from: id, to: connectTo, label: 'Flux sortant', type: 'api', protocol: 'REST API', frequency: 'Temps réel', volume: 'N/A' });
        }

        this.closeModal();

        this.snapshotBefore = {
            apps: JSON.parse(JSON.stringify(this.engine.currentApps)),
            flows: JSON.parse(JSON.stringify(this.engine.currentFlows))
        };

        this.engine.executeAddition(newApp, newFlows);

        this._updateLiveGraph(new Set(), new Set(), new Set([id]));
        this._updateStats();
        this._updateProcesses();
        this._updateHealth();

        this._addLog('add', `<strong>${newApp.name}</strong> ajouté au SI avec ${newFlows.length} flux.`);
        this.toast(`${newApp.name} ajouté au SI`, 'success', '✅');
    }

    _handleMigrate() {
        const nodeId = this.renderer.getSelectedNodeId();
        if (!nodeId) {
            this.toast('Sélectionnez d\'abord une application à migrer', 'warning', '⚠️');
            return;
        }

        const app = this.engine.getApp(nodeId);
        if (!app) return;

        this.openModal(
            `Migrer ${app.name}`,
            `
                <div style="text-align:center;margin-bottom:16px;">
                    <div style="font-size:36px;margin-bottom:8px;">${app.icon} → ☁️</div>
                    <div style="font-size:13px;color:var(--text-secondary);">Remplacement de <strong>${app.name}</strong></div>
                </div>
                <div class="form-group">
                    <label class="form-label">Nouveau nom</label>
                    <input class="form-input" id="migrate-name" value="${app.name} v2" placeholder="Nom de la nouvelle application...">
                </div>
                <div class="form-group">
                    <label class="form-label">Technologie cible</label>
                    <select class="form-select" id="migrate-tech">
                        <option value="SaaS Cloud">SaaS Cloud</option>
                        <option value="PaaS Cloud">PaaS Cloud</option>
                        <option value="IaaS Cloud">IaaS Cloud</option>
                        <option value="On-Premise v2">On-Premise v2</option>
                        <option value="Hybrid Cloud">Hybrid Cloud</option>
                        <option value="Containerized">Containerized (K8s)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Criticité</label>
                    <select class="form-select" id="migrate-criticality">
                        <option value="critique" ${app.criticality === 'critique' ? 'selected' : ''}>Critique</option>
                        <option value="important" ${app.criticality === 'important' ? 'selected' : ''}>Important</option>
                        <option value="standard" ${app.criticality === 'standard' ? 'selected' : ''}>Standard</option>
                    </select>
                </div>
                <div style="background:var(--warning-bg);border:1px solid rgba(255,165,2,0.2);border-radius:var(--radius-sm);padding:14px;">
                    <div style="font-size:12px;color:var(--warning);">
                        ⚡ Tous les flux existants seront automatiquement reconnectés vers la nouvelle application.
                    </div>
                </div>
            `,
            [
                { label: 'Annuler', class: 'btn-ghost', action: () => this.closeModal() },
                { label: 'Migrer', class: 'btn-primary', action: () => this._executeMigrate(nodeId) }
            ]
        );
    }

    _executeMigrate(oldAppId) {
        const name = document.getElementById('migrate-name').value.trim() || 'Nouvelle App';
        const tech = document.getElementById('migrate-tech').value;
        const criticality = document.getElementById('migrate-criticality').value;

        const oldApp = this.engine.getApp(oldAppId);
        const critColors = { critique: '#FF4757', important: '#FFA502', standard: '#2ED573' };

        const newApp = {
            ...oldApp,
            id: 'mig_' + Date.now(),
            name: name,
            shortName: name.substring(0, 8).toUpperCase(),
            technology: tech,
            criticality: criticality,
            color: critColors[criticality],
            icon: '☁️',
            description: `Migration de ${oldApp.name} vers ${name} (${tech}).`
        };

        this.closeModal();

        this.snapshotBefore = {
            apps: JSON.parse(JSON.stringify(this.engine.currentApps)),
            flows: JSON.parse(JSON.stringify(this.engine.currentFlows))
        };

        const impact = this.engine.analyzeMigration(oldAppId, newApp);
        this.engine.executeMigration(oldAppId, newApp);

        const impactedIds = new Set(impact.directDependencies.map(d => d.id));
        this._updateLiveGraph(impactedIds, new Set(), new Set([newApp.id]));
        this.renderer.flashImpactedNodes(impactedIds);

        this._updateStats();
        this._updateProcesses();
        this._updateHealth();

        this._addLog('migrate', `<strong>${oldApp.name}</strong> migré vers <strong>${name}</strong> (${tech}). Flux reconnectés.`);
        this.toast(`Migration effectuée : ${oldApp.name} → ${name}`, 'warning', '🔄');

        document.getElementById('panel-node-info').style.display = 'none';
        document.getElementById('panel-impact').style.display = 'none';
    }

    _handleConnect() {
        const selectedId = this.renderer.getSelectedNodeId();
        if (!selectedId) {
            this.toast('Sélectionnez d\'abord l\'application source', 'warning', '⚠️');
            return;
        }

        const app = this.engine.getApp(selectedId);
        if (!app) return;

        this.connectMode = { step: 'select-target', from: selectedId };
        this._updateHint(`Mode connexion : cliquez sur l'application cible pour créer un flux depuis ${app.shortName}. (Echap pour annuler)`);
        this.toast(`Sélectionnez l'application cible du flux`, 'info', '🔗');
    }

    _completeConnect(fromId, toId) {
        const fromApp = this.engine.getApp(fromId);
        const toApp = this.engine.getApp(toId);

        this.connectMode = null;
        this._updateHint('Cliquez sur un nœud pour voir ses détails');

        this.openModal(
            'Créer un flux',
            `
                <div style="text-align:center;margin-bottom:16px;font-size:14px;">
                    ${fromApp.icon} <strong>${fromApp.shortName}</strong>
                    <span style="color:var(--accent-secondary);margin:0 8px;">→</span>
                    ${toApp.icon} <strong>${toApp.shortName}</strong>
                </div>
                <div class="form-group">
                    <label class="form-label">Nom du flux</label>
                    <input class="form-input" id="flow-label" placeholder="Ex: Synchronisation données..." value="Flux ${fromApp.shortName} → ${toApp.shortName}">
                </div>
                <div class="form-group">
                    <label class="form-label">Type</label>
                    <select class="form-select" id="flow-type">
                        <option value="api">API</option>
                        <option value="data">Données</option>
                        <option value="file">Fichier</option>
                        <option value="event">Événement</option>
                        <option value="auth">Authentification</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Protocole</label>
                    <input class="form-input" id="flow-protocol" placeholder="REST API, SFTP, JDBC..." value="REST API">
                </div>
            `,
            [
                { label: 'Annuler', class: 'btn-ghost', action: () => this.closeModal() },
                { label: 'Créer le flux', class: 'btn-primary', action: () => {
                    const label = document.getElementById('flow-label').value || 'Nouveau flux';
                    const type = document.getElementById('flow-type').value;
                    const protocol = document.getElementById('flow-protocol').value || 'REST';

                    this.closeModal();

                    this.snapshotBefore = {
                        apps: JSON.parse(JSON.stringify(this.engine.currentApps)),
                        flows: JSON.parse(JSON.stringify(this.engine.currentFlows))
                    };

                    this.engine.executeAddFlow(fromId, toId, label, type, protocol);

                    this._updateLiveGraph();
                    this._updateStats();
                    this._updateProcesses();

                    this._addLog('connect', `Flux créé : <strong>${fromApp.shortName} → ${toApp.shortName}</strong> (${label})`);
                    this.toast(`Flux créé : ${fromApp.shortName} → ${toApp.shortName}`, 'info', '🔗');
                }}
            ]
        );
    }

    _handleReset() {
        this.openModal(
            'Réinitialiser le SI ?',
            `
                <div style="text-align:center;font-size:48px;margin-bottom:12px;">🔄</div>
                <p style="text-align:center;font-size:14px;color:var(--text-secondary);">
                    Toutes les transformations seront annulées.<br>
                    Le SI reviendra à son état initial.
                </p>
            `,
            [
                { label: 'Annuler', class: 'btn-ghost', action: () => this.closeModal() },
                { label: 'Réinitialiser', class: 'btn-primary', action: () => {
                    this.closeModal();
                    this.engine.reset();
                    this.snapshotBefore = null;
                    this.log = [];
                    this._renderLiveGraph();
                    this._updateStats();
                    this._updateProcesses();
                    this._updateHealth();
                    this._updateLogUI();
                    document.getElementById('panel-node-info').style.display = 'none';
                    document.getElementById('panel-impact').style.display = 'none';
                    this.toast('SI réinitialisé à son état original', 'success', '✅');
                }}
            ]
        );
    }

    _handleUndo() {
        if (this.engine.undo()) {
            this._updateLiveGraph();
            this._updateStats();
            this._updateProcesses();
            this._updateHealth();
            this.toast('Dernière action annulée', 'info', '↩️');
            document.getElementById('panel-node-info').style.display = 'none';
            document.getElementById('panel-impact').style.display = 'none';
        } else {
            this.toast('Aucune action à annuler', 'warning', '⚠️');
        }
    }

    // ==================== SCENARIOS ====================

    _executeScenario(scenarioId) {
        const scenario = SIData.scenarios[scenarioId];
        if (!scenario) return;

        this.snapshotBefore = {
            apps: JSON.parse(JSON.stringify(this.engine.currentApps)),
            flows: JSON.parse(JSON.stringify(this.engine.currentFlows))
        };

        if (scenario.type === 'remove') {
            const app = this.engine.getApp(scenario.target);
            if (!app) {
                this.toast(`${scenario.target} n'existe plus dans le SI`, 'warning', '⚠️');
                return;
            }

            const impact = this.engine.analyzeRemoval(scenario.target);
            const impactedIds = new Set(impact.directDependencies.map(d => d.id));

            this.engine.executeRemoval(scenario.target);

            this._updateLiveGraph(impactedIds);
            this.renderer.flashImpactedNodes(impactedIds);

            this._addLog('remove', `Scénario <strong>"${scenario.name}"</strong> exécuté. Impact: ${impact.score}/100.`);
            this.toast(`Scénario exécuté : ${scenario.name}`, 'danger', '💥');

            // Show impact
            this._showImpactPreview(impact);

        } else if (scenario.type === 'migrate') {
            const oldApp = this.engine.getApp(scenario.target);
            if (!oldApp) {
                this.toast(`${scenario.target} n'existe plus dans le SI`, 'warning', '⚠️');
                return;
            }

            const impact = this.engine.analyzeMigration(scenario.target, scenario.newApp);
            const impactedIds = new Set(impact.directDependencies.map(d => d.id));

            this.engine.executeMigration(scenario.target, scenario.newApp);

            this._updateLiveGraph(impactedIds, new Set(), new Set([scenario.newApp.id]));
            this.renderer.flashImpactedNodes(impactedIds);

            this._addLog('migrate', `Scénario <strong>"${scenario.name}"</strong> exécuté. Migration complète.`);
            this.toast(`Scénario exécuté : ${scenario.name}`, 'warning', '🔄');

            this._showImpactPreview(impact);

        } else if (scenario.type === 'add') {
            this.engine.executeAddition(scenario.newApp, scenario.newFlows || []);

            this._updateLiveGraph(new Set(), new Set(), new Set([scenario.newApp.id]));

            this._addLog('add', `Scénario <strong>"${scenario.name}"</strong> exécuté.`);
            this.toast(`Scénario exécuté : ${scenario.name}`, 'success', '🆕');
        }

        this._updateStats();
        this._updateProcesses();
        this._updateHealth();

        // Auto-switch to compare if in live view
        if (this.currentView === 'live') {
            // Delay to let user see the flash effect
            setTimeout(() => {
                this.switchView('compare');
            }, 1500);
        }
    }

    // ==================== UI UPDATES ====================

    _updateStats() {
        const stats = this.engine.getStats();
        document.getElementById('stat-apps').textContent = stats.apps;
        document.getElementById('stat-flows').textContent = stats.flows;
        document.getElementById('stat-dbs').textContent = stats.databases;
        document.getElementById('stat-processes').textContent = stats.processes;
    }

    _updateProcesses() {
        const health = this.engine.assessProcessHealth();
        const container = document.getElementById('processes-list');

        container.innerHTML = health.map(proc => {
            const statusIcon = proc.status === 'ok' ? '✅' : proc.status === 'broken' ? '❌' : '⚠️';
            const statusClass = proc.status;

            // Build chain display
            const currentAppIds = new Set(this.engine.currentApps.map(a => a.id));
            const chainHtml = proc.chain.map(appId => {
                const exists = currentAppIds.has(appId);
                const app = this.engine.originalApps.find(a => a.id === appId);
                const name = app ? (app.shortName || app.name) : appId;
                return exists
                    ? `<span class="ok-node">${name}</span>`
                    : `<span class="broken-node">${name}</span>`;
            }).join(' → ');

            return `
                <div class="process-item ${statusClass}">
                    <div class="process-name">
                        <span class="process-status-icon">${statusIcon}</span>
                        ${proc.icon} ${proc.name}
                    </div>
                    <div class="process-chain">${chainHtml}</div>
                </div>
            `;
        }).join('');
    }

    _updateHealth() {
        const health = this.engine.getSIHealth();
        const indicator = document.querySelector('.health-indicator');
        const text = document.querySelector('.health-text');

        indicator.className = `health-indicator ${health.class}`;
        text.textContent = health.text;
    }

    _addLog(type, message) {
        const now = new Date();
        const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        this.log.unshift({ type, message, time });
        this._updateLogUI();
    }

    _updateLogUI() {
        const container = document.getElementById('log-list');
        const count = document.getElementById('log-count');

        count.textContent = this.log.length;

        if (this.log.length === 0) {
            container.innerHTML = `
                <div class="log-empty">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="24" height="20" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3"/><line x1="9" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="1.5" opacity="0.2"/><line x1="9" y1="17" x2="19" y2="17" stroke="currentColor" stroke-width="1.5" opacity="0.2"/></svg>
                    <span>Aucune transformation effectuée</span>
                </div>
            `;
            return;
        }

        container.innerHTML = this.log.map(entry => `
            <div class="log-entry log-${entry.type}">
                <span class="log-time">${entry.time}</span>
                <span class="log-text">${entry.message}</span>
            </div>
        `).join('');
    }

    _updateHint(text) {
        document.getElementById('toolbar-hint').textContent = text;
    }

    _togglePhysics() {
        const enabled = this.renderer.togglePhysics();
        const btn = document.getElementById('btn-physics');
        btn.classList.toggle('active', enabled);
        this.toast(enabled ? 'Physique activée' : 'Physique désactivée', 'info', '⚛️');
    }

    // ==================== MODAL ====================

    openModal(title, bodyHtml, buttons = []) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;

        const footer = document.getElementById('modal-footer');
        footer.innerHTML = '';
        buttons.forEach(btn => {
            const el = document.createElement('button');
            el.className = `btn ${btn.class}`;
            el.textContent = btn.label;
            el.addEventListener('click', btn.action);
            footer.appendChild(el);
        });

        document.getElementById('modal-overlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    }

    // ==================== TOAST ====================

    toast(message, type = 'info', icon = 'ℹ️') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// ==================== BOOTSTRAP ====================
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.__app = app; // Debug access
});
