/**
 * MyCarto Preddict — Graph Renderer
 * 
 * Rendu des graphes de cartographie SI avec vis.js
 * Gère la visualisation live et la comparaison avant/après.
 */

class GraphRenderer {
    constructor() {
        this.liveNetwork = null;
        this.beforeNetwork = null;
        this.afterNetwork = null;
        this.physicsEnabled = true;
        this.selectedNodeId = null;
        this.highlightedNodes = new Set();
        this.highlightedEdges = new Set();

        // Visual config
        this.nodeColors = {
            critique: { background: '#FF4757', border: '#FF6B81', highlight: { background: '#FF6B81', border: '#FFFFFF' }, font: { color: '#FFFFFF' } },
            important: { background: '#FFA502', border: '#FFBE40', highlight: { background: '#FFBE40', border: '#FFFFFF' }, font: { color: '#FFFFFF' } },
            standard: { background: '#2ED573', border: '#7BED9F', highlight: { background: '#7BED9F', border: '#FFFFFF' }, font: { color: '#FFFFFF' } },
            database: { background: '#1E90FF', border: '#54A0FF', highlight: { background: '#54A0FF', border: '#FFFFFF' }, font: { color: '#FFFFFF' } },
            impacted: { background: '#FF4757', border: '#FF0000', highlight: { background: '#FF0000', border: '#FFFFFF' }, font: { color: '#FFFFFF' } },
            removed: { background: '#555555', border: '#777777', highlight: { background: '#777777', border: '#FFFFFF' }, font: { color: '#999999' } },
            added: { background: '#00D9FF', border: '#33E5FF', highlight: { background: '#33E5FF', border: '#FFFFFF' }, font: { color: '#FFFFFF' } }
        };
    }

    /**
     * Options de base pour le réseau vis.js
     */
    getNetworkOptions(interactive = true) {
        return {
            nodes: {
                shape: 'box',
                borderWidth: 2,
                borderWidthSelected: 3,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.3)',
                    size: 8,
                    x: 2,
                    y: 2
                },
                font: {
                    face: 'Inter, sans-serif',
                    size: 13,
                    color: '#FFFFFF',
                    multi: false
                },
                margin: { top: 10, bottom: 10, left: 14, right: 14 },
                widthConstraint: { minimum: 80, maximum: 160 }
            },
            edges: {
                arrows: {
                    to: { enabled: true, scaleFactor: 0.7 }
                },
                color: {
                    color: 'rgba(140, 145, 170, 0.4)',
                    highlight: '#6C63FF',
                    hover: 'rgba(140, 145, 170, 0.7)',
                    inherit: false
                },
                width: 1.5,
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.15
                },
                font: {
                    face: 'JetBrains Mono, monospace',
                    size: 9,
                    color: 'rgba(140, 145, 170, 0.6)',
                    strokeWidth: 3,
                    strokeColor: '#0a0b0f',
                    align: 'middle'
                },
                selectionWidth: 2,
                hoverWidth: 2
            },
            physics: {
                enabled: this.physicsEnabled,
                solver: 'forceAtlas2Based',
                forceAtlas2Based: {
                    gravitationalConstant: -60,
                    centralGravity: 0.008,
                    springLength: 160,
                    springConstant: 0.06,
                    damping: 0.5,
                    avoidOverlap: 0.6
                },
                stabilization: {
                    enabled: true,
                    iterations: 200,
                    updateInterval: 25
                },
                maxVelocity: 30,
                minVelocity: 0.5
            },
            interaction: {
                hover: interactive,
                tooltipDelay: 200,
                navigationButtons: false,
                keyboard: interactive,
                dragNodes: interactive,
                dragView: true,
                zoomView: true,
                selectConnectedEdges: true,
                multiselect: false,
                hoverConnectedEdges: true
            },
            layout: {
                improvedLayout: true,
                randomSeed: 42
            }
        };
    }

    /**
     * Convertit les apps en nœuds vis.js
     */
    appsToNodes(apps, impactedIds = new Set(), removedIds = new Set(), addedIds = new Set()) {
        return apps.map(app => {
            let colorScheme;
            let borderDashes = false;

            if (removedIds.has(app.id)) {
                colorScheme = this.nodeColors.removed;
                borderDashes = [5, 5];
            } else if (addedIds.has(app.id)) {
                colorScheme = this.nodeColors.added;
            } else if (impactedIds.has(app.id)) {
                colorScheme = this.nodeColors.impacted;
            } else if (app.type === 'database') {
                colorScheme = this.nodeColors.database;
            } else {
                colorScheme = this.nodeColors[app.criticality] || this.nodeColors.standard;
            }

            // Format label with icon
            const label = `${app.icon || ''} ${app.shortName || app.name}`;

            return {
                id: app.id,
                label: label,
                title: this._buildTooltip(app),
                color: colorScheme,
                borderDashes: borderDashes,
                font: {
                    color: colorScheme.font ? colorScheme.font.color : '#FFFFFF',
                    size: app.criticality === 'critique' ? 14 : 12
                },
                shapeProperties: {
                    borderRadius: app.type === 'database' ? 15 : app.type === 'infrastructure' ? 4 : 8
                },
                shape: app.type === 'database' ? 'database' : 'box',
                size: app.type === 'database' ? 20 : undefined,
                mass: app.criticality === 'critique' ? 3 : app.criticality === 'important' ? 2 : 1,
                // Custom data
                appData: app
            };
        });
    }

    /**
     * Convertit les flux en arêtes vis.js
     */
    flowsToEdges(flows, brokenFlowIds = new Set()) {
        return flows.map(flow => {
            const isBroken = brokenFlowIds.has(flow.id);
            const edgeColor = isBroken
                ? { color: '#FF4757', highlight: '#FF4757', hover: '#FF4757' }
                : this._getEdgeColor(flow.type);

            return {
                id: flow.id,
                from: flow.from,
                to: flow.to,
                label: flow.label || '',
                title: this._buildEdgeTooltip(flow),
                color: edgeColor,
                dashes: isBroken ? [8, 4] : (flow.type === 'auth' ? [4, 4] : false),
                width: isBroken ? 2.5 : (flow.type === 'auth' ? 1 : 1.5),
                smooth: {
                    type: 'curvedCW',
                    roundness: 0.15
                },
                flowData: flow
            };
        });
    }

    /**
     * Couleur des arêtes selon le type de flux
     */
    _getEdgeColor(type) {
        const colors = {
            api: { color: 'rgba(108, 99, 255, 0.5)', highlight: '#6C63FF', hover: 'rgba(108, 99, 255, 0.8)' },
            data: { color: 'rgba(30, 144, 255, 0.5)', highlight: '#1E90FF', hover: 'rgba(30, 144, 255, 0.8)' },
            auth: { color: 'rgba(255, 71, 87, 0.4)', highlight: '#FF4757', hover: 'rgba(255, 71, 87, 0.7)' },
            file: { color: 'rgba(255, 165, 2, 0.4)', highlight: '#FFA502', hover: 'rgba(255, 165, 2, 0.7)' },
            event: { color: 'rgba(46, 213, 115, 0.4)', highlight: '#2ED573', hover: 'rgba(46, 213, 115, 0.7)' }
        };
        return colors[type] || colors.api;
    }

    /**
     * Tooltip HTML pour un nœud
     */
    _buildTooltip(app) {
        return `<div style="font-family:Inter,sans-serif;padding:8px 12px;max-width:220px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${app.icon} ${app.name}</div>
            <div style="font-size:11px;color:#aaa;margin-bottom:6px;">${app.category}</div>
            <div style="font-size:11px;">
                <span style="color:${app.criticality === 'critique' ? '#FF4757' : app.criticality === 'important' ? '#FFA502' : '#2ED573'};">
                    ● ${app.criticality.toUpperCase()}
                </span>
                &nbsp;|&nbsp; ${app.technology}
            </div>
        </div>`;
    }

    /**
     * Tooltip HTML pour une arête
     */
    _buildEdgeTooltip(flow) {
        return `<div style="font-family:Inter,sans-serif;padding:8px 12px;max-width:200px;">
            <div style="font-weight:700;font-size:12px;margin-bottom:4px;">${flow.label}</div>
            <div style="font-size:11px;color:#aaa;">
                ${flow.protocol} | ${flow.frequency}<br>
                Volume: ${flow.volume}
            </div>
        </div>`;
    }

    // ==================== RENDER METHODS ====================

    /**
     * Rend le graphe live principal
     */
    renderLive(container, apps, flows, onSelect, onDeselect) {
        // Safety: wait for container to have dimensions
        if (!container.offsetWidth || !container.offsetHeight) {
            setTimeout(() => this.renderLive(container, apps, flows, onSelect, onDeselect), 50);
            return;
        }

        const nodes = new vis.DataSet(this.appsToNodes(apps));
        const edges = new vis.DataSet(this.flowsToEdges(flows));

        const options = this.getNetworkOptions(true);

        if (this.liveNetwork) {
            this.liveNetwork.destroy();
        }

        this.liveNetwork = new vis.Network(container, { nodes, edges }, options);

        // Events
        this.liveNetwork.on('selectNode', (params) => {
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                this.selectedNodeId = nodeId;
                this._highlightConnected(this.liveNetwork, nodes, edges, nodeId);
                if (onSelect) onSelect(nodeId);
            }
        });

        this.liveNetwork.on('deselectNode', () => {
            this.selectedNodeId = null;
            this._resetHighlights(this.liveNetwork, nodes, edges);
            if (onDeselect) onDeselect();
        });

        this.liveNetwork.on('stabilizationIterationsDone', () => {
            // Stabilisation finie — fit and keep physics running
            this.liveNetwork.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
        });

        // Also fit once after initial render
        this.liveNetwork.once('afterDrawing', () => {
            this.liveNetwork.fit({ animation: false });
        });

        // Store datasets for updates
        this.liveNodes = nodes;
        this.liveEdges = edges;

        return this.liveNetwork;
    }

    /**
     * Met à jour le graphe live sans re-créer
     */
    updateLive(apps, flows, impactedIds = new Set(), removedIds = new Set(), addedIds = new Set()) {
        if (!this.liveNodes || !this.liveEdges) return;

        const newNodes = this.appsToNodes(apps, impactedIds, removedIds, addedIds);
        const newEdges = this.flowsToEdges(flows);

        // Update nodes
        const currentNodeIds = new Set(this.liveNodes.getIds());
        const newNodeIds = new Set(newNodes.map(n => n.id));

        // Remove deleted nodes
        currentNodeIds.forEach(id => {
            if (!newNodeIds.has(id)) {
                this.liveNodes.remove(id);
            }
        });

        // Add/update nodes
        newNodes.forEach(node => {
            if (currentNodeIds.has(node.id)) {
                this.liveNodes.update(node);
            } else {
                this.liveNodes.add(node);
            }
        });

        // Update edges
        const currentEdgeIds = new Set(this.liveEdges.getIds());
        const newEdgeIds = new Set(newEdges.map(e => e.id));

        currentEdgeIds.forEach(id => {
            if (!newEdgeIds.has(id)) {
                this.liveEdges.remove(id);
            }
        });

        newEdges.forEach(edge => {
            if (currentEdgeIds.has(edge.id)) {
                this.liveEdges.update(edge);
            } else {
                this.liveEdges.add(edge);
            }
        });
    }

    /**
     * Rend la vue comparaison Avant/Après
     */
    renderCompare(beforeContainer, afterContainer, beforeApps, beforeFlows, afterApps, afterFlows, removedIds, addedIds, impactedIds) {
        // Safety: wait for container to have dimensions
        if (!beforeContainer.offsetWidth || !beforeContainer.offsetHeight) {
            setTimeout(() => this.renderCompare(beforeContainer, afterContainer, beforeApps, beforeFlows, afterApps, afterFlows, removedIds, addedIds, impactedIds), 50);
            return;
        }

        const optionsBefore = this.getNetworkOptions(false);
        const optionsAfter = this.getNetworkOptions(false);

        // BEFORE
        const beforeNodes = new vis.DataSet(this.appsToNodes(beforeApps));
        const beforeEdges = new vis.DataSet(this.flowsToEdges(beforeFlows));

        if (this.beforeNetwork) this.beforeNetwork.destroy();
        this.beforeNetwork = new vis.Network(beforeContainer, { nodes: beforeNodes, edges: beforeEdges }, optionsBefore);

        // AFTER — with impact highlighting
        const afterNodes = new vis.DataSet(this.appsToNodes(afterApps, impactedIds, new Set(), addedIds));
        const afterBrokenFlows = new Set();
        const afterEdges = new vis.DataSet(this.flowsToEdges(afterFlows, afterBrokenFlows));

        if (this.afterNetwork) this.afterNetwork.destroy();
        this.afterNetwork = new vis.Network(afterContainer, { nodes: afterNodes, edges: afterEdges }, optionsAfter);

        // Fit both networks after stabilization
        this.beforeNetwork.on('stabilizationIterationsDone', () => {
            this.beforeNetwork.fit({ animation: { duration: 300 } });
        });
        this.afterNetwork.on('stabilizationIterationsDone', () => {
            this.afterNetwork.fit({ animation: { duration: 300 } });
        });

        // Also fit once after initial render
        this.beforeNetwork.once('afterDrawing', () => {
            this.beforeNetwork.fit({ animation: false });
        });
        this.afterNetwork.once('afterDrawing', () => {
            this.afterNetwork.fit({ animation: false });
        });

        // Sync zoom
        this.beforeNetwork.on('zoom', (params) => {
            this.afterNetwork.moveTo({ scale: params.scale });
        });
        this.afterNetwork.on('zoom', (params) => {
            this.beforeNetwork.moveTo({ scale: params.scale });
        });
    }

    /**
     * Highlight connected nodes/edges when a node is selected
     */
    _highlightConnected(network, nodes, edges, nodeId) {
        const connectedEdges = network.getConnectedEdges(nodeId);
        const connectedNodes = network.getConnectedNodes(nodeId);

        // Dim all non-connected
        const allNodes = nodes.get();
        const allEdges = edges.get();

        const updates = [];
        allNodes.forEach(node => {
            if (node.id === nodeId) {
                updates.push({ id: node.id, opacity: 1 });
            } else if (connectedNodes.includes(node.id)) {
                updates.push({ id: node.id, opacity: 1 });
            } else {
                updates.push({ id: node.id, opacity: 0.2, font: { ...node.font, color: 'rgba(255,255,255,0.2)' } });
            }
        });
        nodes.update(updates);

        const edgeUpdates = [];
        allEdges.forEach(edge => {
            if (connectedEdges.includes(edge.id)) {
                edgeUpdates.push({ id: edge.id, width: 3 });
            } else {
                edgeUpdates.push({ id: edge.id, color: { ...edge.color, color: 'rgba(100,100,100,0.1)' }, width: 0.5 });
            }
        });
        edges.update(edgeUpdates);
    }

    /**
     * Reset highlights
     */
    _resetHighlights(network, nodes, edges) {
        const allNodes = nodes.get();
        const allEdges = edges.get();

        const nodeUpdates = allNodes.map(node => ({
            id: node.id,
            opacity: 1,
            font: { ...(node.font || {}), color: '#FFFFFF' }
        }));
        nodes.update(nodeUpdates);

        const edgeUpdates = allEdges.map(edge => {
            const flow = edge.flowData;
            const color = flow ? this._getEdgeColor(flow.type) : { color: 'rgba(140,145,170,0.4)' };
            return { id: edge.id, color: color, width: 1.5 };
        });
        edges.update(edgeUpdates);
    }

    /**
     * Toggle physics
     */
    togglePhysics() {
        this.physicsEnabled = !this.physicsEnabled;
        if (this.liveNetwork) {
            this.liveNetwork.setOptions({ physics: { enabled: this.physicsEnabled } });
        }
        return this.physicsEnabled;
    }

    /**
     * Fit view
     */
    fitView(network = null) {
        const net = network || this.liveNetwork;
        if (net) {
            net.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
        }
    }

    /**
     * Get selected node
     */
    getSelectedNodeId() {
        return this.selectedNodeId;
    }

    /**
     * Flash/animate impacted nodes
     */
    flashImpactedNodes(impactedIds) {
        if (!this.liveNodes) return;

        // Pulse animation via color cycling
        let count = 0;
        const interval = setInterval(() => {
            const on = count % 2 === 0;
            impactedIds.forEach(id => {
                const node = this.liveNodes.get(id);
                if (node) {
                    this.liveNodes.update({
                        id: id,
                        color: on ? this.nodeColors.impacted : (node.appData ? this.nodeColors[node.appData.criticality] || this.nodeColors.standard : this.nodeColors.standard)
                    });
                }
            });
            count++;
            if (count >= 6) {
                clearInterval(interval);
                // Leave impacted state
                impactedIds.forEach(id => {
                    this.liveNodes.update({
                        id: id,
                        color: this.nodeColors.impacted
                    });
                });
            }
        }, 300);
    }
}
