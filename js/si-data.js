/**
 * MyCarto Preddict — SI Data Model
 * 
 * Modèle de données complet d'un mini Système d'Information réaliste.
 * Inclut : Applications, Bases de données, Flux, Processus métier.
 */

const SIData = {
    /**
     * Applications du SI
     * Types: app, database, infrastructure, external
     * Criticality: critique, important, standard
     */
    applications: [
        {
            id: 'crm',
            name: 'CRM Salesforce',
            shortName: 'CRM',
            type: 'app',
            category: 'Commercial',
            criticality: 'critique',
            icon: '🎯',
            color: '#FF4757',
            description: 'Gestion de la relation client, pipeline commercial, contacts et opportunités.',
            owner: 'Direction Commerciale',
            technology: 'SaaS Cloud',
            users: 120,
            sla: '99.9%',
            cost: '45K€/an'
        },
        {
            id: 'erp',
            name: 'ERP SAP S/4HANA',
            shortName: 'ERP',
            type: 'app',
            category: 'Finance & Opérations',
            criticality: 'critique',
            icon: '⚙️',
            color: '#FF4757',
            description: 'Cœur du SI : gestion financière, achats, production, logistique.',
            owner: 'Direction Financière',
            technology: 'On-Premise',
            users: 250,
            sla: '99.95%',
            cost: '180K€/an'
        },
        {
            id: 'facturation',
            name: 'Module Facturation',
            shortName: 'FACT',
            type: 'app',
            category: 'Finance',
            criticality: 'critique',
            icon: '💰',
            color: '#FF4757',
            description: 'Génération et suivi des factures clients et fournisseurs.',
            owner: 'Direction Financière',
            technology: 'Module ERP',
            users: 45,
            sla: '99.9%',
            cost: 'Inclus ERP'
        },
        {
            id: 'datawarehouse',
            name: 'Data Warehouse',
            shortName: 'DWH',
            type: 'database',
            category: 'Data & Analytics',
            criticality: 'important',
            icon: '📊',
            color: '#1E90FF',
            description: 'Entrepôt de données pour le reporting et l\'analyse décisionnelle.',
            owner: 'Direction Data',
            technology: 'Snowflake Cloud',
            users: 80,
            sla: '99.5%',
            cost: '35K€/an'
        },
        {
            id: 'stock',
            name: 'Gestion des Stocks',
            shortName: 'STOCK',
            type: 'app',
            category: 'Logistique',
            criticality: 'important',
            icon: '📦',
            color: '#FFA502',
            description: 'Gestion des inventaires, réapprovisionnement et suivi logistique.',
            owner: 'Direction Supply Chain',
            technology: 'Module ERP',
            users: 60,
            sla: '99.5%',
            cost: 'Inclus ERP'
        },
        {
            id: 'ecommerce',
            name: 'Site E-commerce',
            shortName: 'E-COM',
            type: 'app',
            category: 'Ventes en ligne',
            criticality: 'critique',
            icon: '🛒',
            color: '#FF4757',
            description: 'Plateforme de vente en ligne B2C et B2B.',
            owner: 'Direction Digitale',
            technology: 'Magento Cloud',
            users: 15000,
            sla: '99.9%',
            cost: '55K€/an'
        },
        {
            id: 'rh',
            name: 'SIRH Workday',
            shortName: 'SIRH',
            type: 'app',
            category: 'Ressources Humaines',
            criticality: 'important',
            icon: '👥',
            color: '#FFA502',
            description: 'Gestion des talents, paie, congés, formation et recrutement.',
            owner: 'Direction RH',
            technology: 'SaaS Cloud',
            users: 300,
            sla: '99.5%',
            cost: '30K€/an'
        },
        {
            id: 'email',
            name: 'Messagerie O365',
            shortName: 'MAIL',
            type: 'app',
            category: 'Communication',
            criticality: 'important',
            icon: '📧',
            color: '#FFA502',
            description: 'Suite collaborative : email, Teams, SharePoint, OneDrive.',
            owner: 'DSI',
            technology: 'SaaS Cloud',
            users: 350,
            sla: '99.9%',
            cost: '25K€/an'
        },
        {
            id: 'ad',
            name: 'Active Directory',
            shortName: 'AD',
            type: 'infrastructure',
            category: 'Sécurité & IAM',
            criticality: 'critique',
            icon: '🔐',
            color: '#FF4757',
            description: 'Annuaire centralisé : authentification, autorisations, SSO.',
            owner: 'DSI',
            technology: 'Azure AD Hybrid',
            users: 350,
            sla: '99.99%',
            cost: '15K€/an'
        },
        {
            id: 'bi',
            name: 'BI Power BI',
            shortName: 'BI',
            type: 'app',
            category: 'Data & Analytics',
            criticality: 'standard',
            icon: '📈',
            color: '#2ED573',
            description: 'Tableaux de bord et reporting pour la direction.',
            owner: 'Direction Data',
            technology: 'SaaS Cloud',
            users: 50,
            sla: '99%',
            cost: '12K€/an'
        },
        {
            id: 'legacy',
            name: 'Mainframe Legacy',
            shortName: 'LEGACY',
            type: 'app',
            category: 'Historique',
            criticality: 'important',
            icon: '🖥️',
            color: '#FFA502',
            description: 'Ancien système central : traitements batch, historique comptable.',
            owner: 'DSI',
            technology: 'COBOL / AS400',
            users: 10,
            sla: '98%',
            cost: '85K€/an'
        },
        {
            id: 'db_erp',
            name: 'BDD Oracle ERP',
            shortName: 'DB-ERP',
            type: 'database',
            category: 'Infrastructure',
            criticality: 'critique',
            icon: '🗄️',
            color: '#1E90FF',
            description: 'Base de données principale du système ERP.',
            owner: 'DSI',
            technology: 'Oracle 19c',
            users: 0,
            sla: '99.99%',
            cost: '40K€/an'
        },
        {
            id: 'db_crm',
            name: 'BDD CRM Cloud',
            shortName: 'DB-CRM',
            type: 'database',
            category: 'Infrastructure',
            criticality: 'important',
            icon: '🗄️',
            color: '#1E90FF',
            description: 'Base de données cloud du CRM (hébergée par Salesforce).',
            owner: 'Direction Commerciale',
            technology: 'Salesforce DB',
            users: 0,
            sla: '99.9%',
            cost: 'Inclus CRM'
        }
    ],

    /**
     * Flux entre applications
     * type: data, api, file, event, auth
     * protocol: REST, SOAP, SFTP, JDBC, LDAP, Kafka, etc.
     */
    flows: [
        { id: 'f1', from: 'crm', to: 'erp', label: 'Commandes clients', type: 'api', protocol: 'REST API', frequency: 'Temps réel', volume: '5K/jour' },
        { id: 'f2', from: 'crm', to: 'datawarehouse', label: 'Données clients', type: 'data', protocol: 'ETL Batch', frequency: 'Quotidien', volume: '200K lignes' },
        { id: 'f3', from: 'erp', to: 'facturation', label: 'Données facturation', type: 'data', protocol: 'Interne', frequency: 'Temps réel', volume: '3K/jour' },
        { id: 'f4', from: 'erp', to: 'stock', label: 'Mouvements stock', type: 'api', protocol: 'RFC/BAPI', frequency: 'Temps réel', volume: '10K/jour' },
        { id: 'f5', from: 'stock', to: 'ecommerce', label: 'Disponibilité stock', type: 'api', protocol: 'REST API', frequency: 'Temps réel', volume: '50K/jour' },
        { id: 'f6', from: 'ecommerce', to: 'crm', label: 'Nouveaux clients web', type: 'api', protocol: 'REST API', frequency: 'Temps réel', volume: '500/jour' },
        { id: 'f7', from: 'ecommerce', to: 'erp', label: 'Commandes web', type: 'api', protocol: 'REST API', frequency: 'Temps réel', volume: '2K/jour' },
        { id: 'f8', from: 'erp', to: 'datawarehouse', label: 'Données financières', type: 'data', protocol: 'ETL Batch', frequency: 'Quotidien', volume: '500K lignes' },
        { id: 'f9', from: 'datawarehouse', to: 'bi', label: 'Cubes analytiques', type: 'data', protocol: 'DirectQuery', frequency: 'Temps réel', volume: 'Variable' },
        { id: 'f10', from: 'ad', to: 'crm', label: 'Authentification SSO', type: 'auth', protocol: 'SAML 2.0', frequency: 'Temps réel', volume: '500/jour' },
        { id: 'f11', from: 'ad', to: 'erp', label: 'Authentification SSO', type: 'auth', protocol: 'LDAP', frequency: 'Temps réel', volume: '1K/jour' },
        { id: 'f12', from: 'ad', to: 'email', label: 'Authentification SSO', type: 'auth', protocol: 'Azure AD', frequency: 'Temps réel', volume: '2K/jour' },
        { id: 'f13', from: 'ad', to: 'rh', label: 'Provisioning comptes', type: 'auth', protocol: 'SCIM', frequency: 'Événementiel', volume: '50/jour' },
        { id: 'f14', from: 'rh', to: 'erp', label: 'Données employés', type: 'data', protocol: 'REST API', frequency: 'Quotidien', volume: '300 rec.' },
        { id: 'f15', from: 'rh', to: 'email', label: 'Notifications RH', type: 'event', protocol: 'SMTP', frequency: 'Événementiel', volume: '100/jour' },
        { id: 'f16', from: 'legacy', to: 'erp', label: 'Historique compta', type: 'file', protocol: 'SFTP Batch', frequency: 'Hebdomadaire', volume: '1M lignes' },
        { id: 'f17', from: 'legacy', to: 'datawarehouse', label: 'Archives données', type: 'file', protocol: 'ETL Batch', frequency: 'Mensuel', volume: '5M lignes' },
        { id: 'f18', from: 'erp', to: 'db_erp', label: 'Persistance données', type: 'data', protocol: 'JDBC', frequency: 'Temps réel', volume: 'Continu' },
        { id: 'f19', from: 'crm', to: 'db_crm', label: 'Persistance CRM', type: 'data', protocol: 'Interne', frequency: 'Temps réel', volume: 'Continu' },
        { id: 'f20', from: 'facturation', to: 'email', label: 'Envoi factures PDF', type: 'event', protocol: 'SMTP', frequency: 'Quotidien', volume: '200/jour' },
        { id: 'f21', from: 'ad', to: 'ecommerce', label: 'Auth backoffice', type: 'auth', protocol: 'OAuth 2.0', frequency: 'Temps réel', volume: '100/jour' },
        { id: 'f22', from: 'ad', to: 'bi', label: 'Auth BI', type: 'auth', protocol: 'Azure AD', frequency: 'Temps réel', volume: '200/jour' }
    ],

    /**
     * Processus métier
     * chain: ordered list of app IDs that participate in the process
     */
    processes: [
        {
            id: 'p1',
            name: 'Vente en ligne (Order-to-Cash)',
            icon: '🛍️',
            description: 'Processus complet de vente depuis la commande web jusqu\'à la facturation.',
            chain: ['ecommerce', 'crm', 'erp', 'stock', 'facturation', 'email'],
            criticality: 'critique'
        },
        {
            id: 'p2',
            name: 'Vente B2B (Quote-to-Cash)',
            icon: '🤝',
            description: 'Cycle de vente B2B : devis, commande, livraison, facturation.',
            chain: ['crm', 'erp', 'stock', 'facturation', 'email'],
            criticality: 'critique'
        },
        {
            id: 'p3',
            name: 'Reporting décisionnel',
            icon: '📊',
            description: 'Collecte et analyse des données pour les tableaux de bord direction.',
            chain: ['crm', 'erp', 'legacy', 'datawarehouse', 'bi'],
            criticality: 'important'
        },
        {
            id: 'p4',
            name: 'Onboarding employé',
            icon: '🆕',
            description: 'Processus d\'intégration d\'un nouvel employé.',
            chain: ['rh', 'ad', 'email', 'erp'],
            criticality: 'important'
        },
        {
            id: 'p5',
            name: 'Gestion des stocks',
            icon: '📦',
            description: 'Suivi des niveaux de stock et réapprovisionnement automatique.',
            chain: ['erp', 'stock', 'ecommerce'],
            criticality: 'critique'
        },
        {
            id: 'p6',
            name: 'Authentification globale',
            icon: '🔐',
            description: 'Accès sécurisé à tous les services via le SSO.',
            chain: ['ad', 'crm', 'erp', 'email', 'rh', 'bi', 'ecommerce'],
            criticality: 'critique'
        },
        {
            id: 'p7',
            name: 'Clôture comptable mensuelle',
            icon: '📋',
            description: 'Consolidation comptable incluant données legacy.',
            chain: ['legacy', 'erp', 'facturation', 'datawarehouse', 'bi'],
            criticality: 'important'
        }
    ],

    /**
     * Scénarios prédéfinis
     */
    scenarios: {
        'remove-crm': {
            name: 'Suppression du CRM',
            type: 'remove',
            target: 'crm',
            description: 'Simulation du retrait complet du CRM Salesforce du SI.'
        },
        'migrate-erp': {
            name: 'Migration ERP vers Cloud',
            type: 'migrate',
            target: 'erp',
            newApp: {
                id: 'erp_cloud',
                name: 'ERP Cloud Oracle',
                shortName: 'ERP-C',
                type: 'app',
                category: 'Finance & Opérations',
                criticality: 'critique',
                icon: '☁️',
                color: '#FF4757',
                description: 'Nouvel ERP full cloud Oracle Fusion.',
                owner: 'Direction Financière',
                technology: 'SaaS Cloud',
                users: 250,
                sla: '99.95%',
                cost: '150K€/an'
            },
            description: 'Migration du ERP SAP On-Premise vers Oracle Cloud ERP.'
        },
        'add-api-gateway': {
            name: 'Ajout API Gateway',
            type: 'add',
            newApp: {
                id: 'api_gw',
                name: 'API Gateway Kong',
                shortName: 'API-GW',
                type: 'infrastructure',
                category: 'Intégration',
                criticality: 'important',
                icon: '🔗',
                color: '#FFA502',
                description: 'Gateway centralisée pour sécuriser et monitorer tous les flux API.',
                owner: 'DSI',
                technology: 'Kong Enterprise',
                users: 0,
                sla: '99.9%',
                cost: '20K€/an'
            },
            newFlows: [
                { from: 'api_gw', to: 'crm', label: 'Proxy CRM', type: 'api', protocol: 'REST', frequency: 'Temps réel', volume: 'Proxy' },
                { from: 'api_gw', to: 'erp', label: 'Proxy ERP', type: 'api', protocol: 'REST', frequency: 'Temps réel', volume: 'Proxy' },
                { from: 'ecommerce', to: 'api_gw', label: 'Appels API', type: 'api', protocol: 'REST', frequency: 'Temps réel', volume: '50K/jour' }
            ],
            description: 'Ajout d\'une couche API Gateway pour centraliser les intégrations.'
        },
        'remove-legacy': {
            name: 'Retrait du Mainframe Legacy',
            type: 'remove',
            target: 'legacy',
            description: 'Décommissionnement du système mainframe historique.'
        },
        'security-breach': {
            name: 'Panne Active Directory',
            type: 'remove',
            target: 'ad',
            description: 'Simulation d\'une panne totale de l\'Active Directory.'
        }
    },

    /**
     * Templates d'applications pour l'ajout
     */
    appTemplates: [
        { id: 'tpl_middleware', name: 'Middleware ESB', icon: '🔄', type: 'infrastructure', category: 'Intégration', criticality: 'important', color: '#FFA502' },
        { id: 'tpl_monitoring', name: 'Monitoring (Datadog)', icon: '📡', type: 'infrastructure', category: 'Observabilité', criticality: 'standard', color: '#2ED573' },
        { id: 'tpl_cms', name: 'CMS WordPress', icon: '🌐', type: 'app', category: 'Communication', criticality: 'standard', color: '#2ED573' },
        { id: 'tpl_ticketing', name: 'ITSM ServiceNow', icon: '🎫', type: 'app', category: 'Support IT', criticality: 'important', color: '#FFA502' },
        { id: 'tpl_cicd', name: 'CI/CD GitLab', icon: '🚀', type: 'infrastructure', category: 'DevOps', criticality: 'important', color: '#FFA502' },
        { id: 'tpl_api_gw', name: 'API Gateway', icon: '🔗', type: 'infrastructure', category: 'Intégration', criticality: 'important', color: '#FFA502' },
        { id: 'tpl_datalake', name: 'Data Lake', icon: '🏊', type: 'database', category: 'Data & Analytics', criticality: 'standard', color: '#1E90FF' },
        { id: 'tpl_custom', name: 'Application personnalisée...', icon: '✨', type: 'app', category: 'Custom', criticality: 'standard', color: '#2ED573' }
    ]
};

// Deep clone utility
function cloneSIData() {
    return JSON.parse(JSON.stringify(SIData));
}
