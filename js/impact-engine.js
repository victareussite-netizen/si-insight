/**
 * MyCarto Preddict — Impact Analysis Engine
 * 
 * Moteur d'analyse d'impact pour les transformations SI.
 * Calcule les dépendances, flux cassés, processus impactés et score de risque.
 */

class ImpactEngine {
    constructor() {
        this.currentApps = [];
        this.currentFlows = [];
        this.currentProcesses = [];
        this.history = [];
        this.maxHistory = 30;
    }

    /**
     * Initialise le moteur avec les données SI
     */
    init(apps, flows, processes) {
        this.currentApps = JSON.parse(JSON.stringify(apps));
        this.currentFlows = JSON.parse(JSON.stringify(flows));
        this.currentProcesses = JSON.parse(JSON.stringify(processes));
        this.originalApps = JSON.parse(JSON.stringify(apps));
        this.originalFlows = JSON.parse(JSON.stringify(flows));
        this.originalProcesses = JSON.parse(JSON.stringify(processes));
        this.history = [];
    }

    /**
     * Sauvegarde l'état actuel dans l'historique (pour undo)
     */
    saveState() {
        this.history.push({
            apps: JSON.parse(JSON.stringify(this.currentApps)),
            flows: JSON.parse(JSON.stringify(this.currentFlows))
        });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Annule la dernière action
     */
    undo() {
        if (this.history.length === 0) return false;
        const state = this.history.pop();
        this.currentApps = state.apps;
        this.currentFlows = state.flows;
        return true;
    }

    /**
     * Reset complet au SI initial
     */
    reset() {
        this.currentApps = JSON.parse(JSON.stringify(this.originalApps));
        this.currentFlows = JSON.parse(JSON.stringify(this.originalFlows));
        this.history = [];
    }

    // ==================== QUERIES ====================

    /**
     * Récupère une application par ID
     */
    getApp(id) {
        return this.currentApps.find(a => a.id === id);
    }

    /**
     * Récupère tous les flux connectés à une application
     */
    getFlowsForApp(appId) {
        return this.currentFlows.filter(f => f.from === appId || f.to === appId);
    }

    /**
     * Récupère les flux sortants d'une application
     */
    getOutgoingFlows(appId) {
        return this.currentFlows.filter(f => f.from === appId);
    }

    /**
     * Récupère les flux entrants d'une application
     */
    getIncomingFlows(appId) {
        return this.currentFlows.filter(f => f.to === appId);
    }

    /**
     * Trouve toutes les dépendances directes (apps connectées)
     */
    getDirectDependencies(appId) {
        const flows = this.getFlowsForApp(appId);
        const depIds = new Set();
        flows.forEach(f => {
            if (f.from === appId) depIds.add(f.to);
            if (f.to === appId) depIds.add(f.from);
        });
        return [...depIds].map(id => this.getApp(id)).filter(Boolean);
    }

    /**
     * Trouve TOUTES les dépendances en cascade (BFS)
     */
    getCascadeDependencies(appId, depth = 10) {
        const visited = new Set([appId]);
        const queue = [{ id: appId, level: 0 }];
        const result = [];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.level >= depth) continue;

            const deps = this.getDirectDependencies(current.id);
            for (const dep of deps) {
                if (!visited.has(dep.id)) {
                    visited.add(dep.id);
                    result.push({ ...dep, cascadeLevel: current.level + 1 });
                    queue.push({ id: dep.id, level: current.level + 1 });
                }
            }
        }

        return result;
    }

    /**
     * Calcule les dépendances qui DÉPENDENT de cette app (downstream)
     */
    getDownstreamDependencies(appId, depth = 10) {
        const visited = new Set([appId]);
        const queue = [{ id: appId, level: 0 }];
        const result = [];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.level >= depth) continue;

            // Apps qui reçoivent des flux de current
            const outgoing = this.getOutgoingFlows(current.id);
            for (const flow of outgoing) {
                if (!visited.has(flow.to)) {
                    visited.add(flow.to);
                    const app = this.getApp(flow.to);
                    if (app) {
                        result.push({ ...app, cascadeLevel: current.level + 1, via: flow });
                        queue.push({ id: flow.to, level: current.level + 1 });
                    }
                }
            }
        }

        return result;
    }

    /**
     * Calcule les dépendances DONT cette app dépend (upstream)
     */
    getUpstreamDependencies(appId, depth = 10) {
        const visited = new Set([appId]);
        const queue = [{ id: appId, level: 0 }];
        const result = [];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.level >= depth) continue;

            const incoming = this.getIncomingFlows(current.id);
            for (const flow of incoming) {
                if (!visited.has(flow.from)) {
                    visited.add(flow.from);
                    const app = this.getApp(flow.from);
                    if (app) {
                        result.push({ ...app, cascadeLevel: current.level + 1, via: flow });
                        queue.push({ id: flow.from, level: current.level + 1 });
                    }
                }
            }
        }

        return result;
    }

    // ==================== IMPACT ANALYSIS ====================

    /**
     * Analyse complète de l'impact de la suppression d'une application
     */
    analyzeRemoval(appId) {
        const app = this.getApp(appId);
        if (!app) return null;

        const directDeps = this.getDirectDependencies(appId);
        const cascadeDeps = this.getCascadeDependencies(appId);
        const affectedFlows = this.getFlowsForApp(appId);
        const downstreamDeps = this.getDownstreamDependencies(appId);

        // Processus impactés
        const affectedProcesses = this.currentProcesses.map(proc => {
            const hasApp = proc.chain.includes(appId);
            if (!hasApp) return { ...proc, status: 'ok' };

            // Vérifier si le processus est complètement cassé ou seulement dégradé
            const idx = proc.chain.indexOf(appId);
            const isCriticalLink = idx === 0 || idx === proc.chain.length - 1 
                || this.isFlowExist(proc.chain[idx - 1], appId)
                || this.isFlowExist(appId, proc.chain[idx + 1]);
            
            return {
                ...proc,
                status: isCriticalLink ? 'broken' : 'degraded',
                missingNode: appId
            };
        });

        // Redondances possibles
        const redundancies = this.findRedundancies(appId);

        // Score d'impact (0-100)
        const score = this.calculateImpactScore(app, affectedFlows, affectedProcesses, cascadeDeps);

        // Sévérité
        const severity = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

        return {
            app,
            type: 'removal',
            directDependencies: directDeps,
            cascadeDependencies: cascadeDeps,
            downstreamDependencies: downstreamDeps,
            affectedFlows,
            affectedProcesses,
            redundancies,
            score,
            severity,
            brokenProcessCount: affectedProcesses.filter(p => p.status === 'broken').length,
            degradedProcessCount: affectedProcesses.filter(p => p.status === 'degraded').length,
            okProcessCount: affectedProcesses.filter(p => p.status === 'ok').length
        };
    }

    /**
     * Analyse l'impact d'une migration/remplacement
     */
    analyzeMigration(oldAppId, newApp) {
        const removalImpact = this.analyzeRemoval(oldAppId);
        if (!removalImpact) return null;

        // La migration réduit l'impact car les flux sont reconnectés
        const mitigatedScore = Math.max(10, Math.round(removalImpact.score * 0.4));

        return {
            ...removalImpact,
            type: 'migration',
            newApp,
            score: mitigatedScore,
            severity: mitigatedScore >= 50 ? 'high' : mitigatedScore >= 25 ? 'medium' : 'low',
            mitigationNote: `Les flux existants seront reconnectés vers ${newApp.name}. Risque résiduel de migration.`
        };
    }

    /**
     * Analyse l'impact de l'ajout d'une application
     */
    analyzeAddition(newApp, newFlows = []) {
        const connectedApps = new Set();
        newFlows.forEach(f => {
            if (f.from !== newApp.id) connectedApps.add(f.from);
            if (f.to !== newApp.id) connectedApps.add(f.to);
        });

        const connections = [...connectedApps].map(id => this.getApp(id)).filter(Boolean);

        return {
            app: newApp,
            type: 'addition',
            newFlows,
            connections,
            score: 10,
            severity: 'low',
            affectedProcesses: this.currentProcesses.map(p => ({ ...p, status: 'ok' })),
            brokenProcessCount: 0,
            degradedProcessCount: 0,
            okProcessCount: this.currentProcesses.length
        };
    }

    // ==================== TRANSFORMATIONS ====================

    /**
     * Exécute la suppression d'une application
     */
    executeRemoval(appId) {
        this.saveState();
        this.currentApps = this.currentApps.filter(a => a.id !== appId);
        this.currentFlows = this.currentFlows.filter(f => f.from !== appId && f.to !== appId);
        return true;
    }

    /**
     * Exécute l'ajout d'une application
     */
    executeAddition(newApp, newFlows = []) {
        this.saveState();
        this.currentApps.push(newApp);
        newFlows.forEach((flow, i) => {
            this.currentFlows.push({
                id: `f_new_${Date.now()}_${i}`,
                ...flow
            });
        });
        return true;
    }

    /**
     * Exécute une migration/remplacement
     */
    executeMigration(oldAppId, newApp) {
        this.saveState();

        // Récupérer tous les flux de l'ancienne app
        const oldFlows = this.getFlowsForApp(oldAppId);

        // Supprimer l'ancienne app
        this.currentApps = this.currentApps.filter(a => a.id !== oldAppId);
        this.currentFlows = this.currentFlows.filter(f => f.from !== oldAppId && f.to !== oldAppId);

        // Ajouter la nouvelle app
        this.currentApps.push(newApp);

        // Reconnecter les flux
        oldFlows.forEach((flow, i) => {
            const newFlow = { ...flow, id: `f_mig_${Date.now()}_${i}` };
            if (newFlow.from === oldAppId) newFlow.from = newApp.id;
            if (newFlow.to === oldAppId) newFlow.to = newApp.id;
            this.currentFlows.push(newFlow);
        });

        return true;
    }

    /**
     * Ajoute un flux entre deux applications
     */
    executeAddFlow(fromId, toId, label = 'Nouveau flux', type = 'api', protocol = 'REST') {
        this.saveState();
        const flow = {
            id: `f_conn_${Date.now()}`,
            from: fromId,
            to: toId,
            label: label,
            type: type,
            protocol: protocol,
            frequency: 'Temps réel',
            volume: 'N/A'
        };
        this.currentFlows.push(flow);
        return flow;
    }

    // ==================== UTILITIES ====================

    /**
     * Vérifie si un flux existe entre deux apps
     */
    isFlowExist(fromId, toId) {
        return this.currentFlows.some(f => 
            (f.from === fromId && f.to === toId) || (f.from === toId && f.to === fromId)
        );
    }

    /**
     * Trouve les redondances fonctionnelles potentielles
     */
    findRedundancies(appId) {
        const app = this.getApp(appId);
        if (!app) return [];

        return this.currentApps.filter(a => 
            a.id !== appId && a.category === app.category && a.type === app.type
        );
    }

    /**
     * Calcule le score d'impact (0-100)
     */
    calculateImpactScore(app, affectedFlows, affectedProcesses, cascadeDeps) {
        let score = 0;

        // Criticité de l'app (0-30)
        if (app.criticality === 'critique') score += 30;
        else if (app.criticality === 'important') score += 20;
        else score += 10;

        // Nombre de flux impactés (0-25)
        const flowScore = Math.min(25, affectedFlows.length * 4);
        score += flowScore;

        // Processus cassés (0-25)
        const brokenCount = affectedProcesses.filter(p => p.status === 'broken').length;
        const degradedCount = affectedProcesses.filter(p => p.status === 'degraded').length;
        score += Math.min(25, brokenCount * 8 + degradedCount * 3);

        // Cascade depth (0-20)
        const maxCascadeLevel = cascadeDeps.reduce((max, d) => Math.max(max, d.cascadeLevel || 0), 0);
        score += Math.min(20, cascadeDeps.length * 2 + maxCascadeLevel * 5);

        return Math.min(100, Math.round(score));
    }

    /**
     * Obtient le statut global du SI
     */
    getSIHealth() {
        const totalOrigApps = this.originalApps.length;
        const totalCurrentApps = this.currentApps.length;
        const totalOrigFlows = this.originalFlows.length;
        const totalCurrentFlows = this.currentFlows.length;

        // Vérifier les processus cassés
        const processHealth = this.assessProcessHealth();
        const brokenCount = processHealth.filter(p => p.status === 'broken').length;
        const degradedCount = processHealth.filter(p => p.status === 'degraded').length;

        if (brokenCount >= 2) return { status: 'critical', text: 'SI Critique', class: 'critical' };
        if (brokenCount >= 1 || degradedCount >= 2) return { status: 'warning', text: 'SI Dégradé', class: 'warning' };
        return { status: 'healthy', text: 'SI Opérationnel', class: 'healthy' };
    }

    /**
     * Évalue l'état de tous les processus métier
     */
    assessProcessHealth() {
        const currentAppIds = new Set(this.currentApps.map(a => a.id));

        return this.currentProcesses.map(proc => {
            const missingApps = proc.chain.filter(appId => !currentAppIds.has(appId));

            if (missingApps.length === 0) {
                // Vérifier aussi que les flux entre les étapes existent
                let allFlowsOk = true;
                for (let i = 0; i < proc.chain.length - 1; i++) {
                    if (!this.isFlowExist(proc.chain[i], proc.chain[i + 1])) {
                        allFlowsOk = false;
                        break;
                    }
                }
                return { ...proc, status: allFlowsOk ? 'ok' : 'degraded', missingApps: [] };
            }

            // Si une app critique du processus manque
            const criticalMissing = missingApps.some(id => {
                const origApp = this.originalApps.find(a => a.id === id);
                return origApp && origApp.criticality === 'critique';
            });

            return {
                ...proc,
                status: missingApps.length > 1 || criticalMissing ? 'broken' : 'degraded',
                missingApps
            };
        });
    }

    /**
     * Stats du SI
     */
    getStats() {
        return {
            apps: this.currentApps.filter(a => a.type === 'app' || a.type === 'infrastructure').length,
            flows: this.currentFlows.length,
            databases: this.currentApps.filter(a => a.type === 'database').length,
            processes: this.currentProcesses.length
        };
    }
}
