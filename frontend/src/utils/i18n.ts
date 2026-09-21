import { useSettings } from '../contexts/SettingsContext'
import { convertCurrency } from './formatters'

export type Language = 'fr' | 'en'

export interface Translations {
  common: {
    loading: string
    noData: string
    save: string
    cancel: string
    delete: string
    edit: string
    back: string
    settings: string
    notifications: string
    security: string
    language: string
    currency: string
    profile: string
    wallet: string
    payments: string
    dashboard: string
    verification: string
    users: string
    fraudAlerts: string
    logout: string
    status: string
    actions: string
    amount: string
    date: string
    description: string
    recipient: string
    sender: string
    account: string
    balance: string
    limits: string
    documents: string
    submit: string
    required: string
    optional: string
    noDocuments: string
    noTransactions: string
    noAlerts: string
    noNotifications: string
    welcome: string
    overview: string
    analytics: string
    reporting: string
    volume: string
    transactions: string
    fraudRate: string
    revenue: string
    dailyLimit: string
    monthlyLimit: string
    walletNumber: string
    accountNumber: string
    cardholder: string
    expiry: string
    search: string
    refresh: string
    exportCSV: string
    exportPDF: string
    print: string
    downloadReceipt: string
    confirmPayment: string
    twoFactorCode: string
    codeReceived: string
    token: string
    iban: string
    reference: string
    channel: string
    operator: string
    mode: string
    bankTransfer: string
    mobileMoney: string
    card: string
    qrCode: string
    review: string
    approve: string
    reject: string
    suspend: string
    reactivate: string
    permanentlyDelete: string
    cancelDeletion: string
    reactivationDeadline: string
    accountStatus: string
    riskScore: string
    trustScore: string
    recommendation: string
    documentsAnalyzed: string
    alerts: string
    noScore: string
    recalculate: string
    validation: string
    rejectionReason: string
    firstName: string
    lastName: string
    email: string
    phone: string
    cin: string
    dateOfBirth: string
    address: string
    city: string
    country: string
    postalCode: string
    role: string
    company: string
    personalInfo: string
    addressInfo: string
    companyInfo: string
    walletInfo: string
    verificationStatus: string
    kyc: string
    kyb: string
    idCard: string
    passport: string
    addressProof: string
    kbis: string
    nif: string
    rib: string
    front: string
    back: string
    temporaryIban: string
    qrData: string
    metadata: string
    details: string
    history: string
    lastTransactions: string
    sendPayment: string
    recipientAccount: string
    phoneNumber: string
    amountLabel: string
    searchRecipient: string
    recipientInfo: string
    paymentMode: string
    selectOperator: string
    cardToken: string
    generateToken: string
    payNow: string
    paymentAuthorized: string
    sandboxToken: string
    performance: string
    channels: string
    channelsDescription: string
    aiMetrics: string
    metricsDescription: string
    precision: string
    recall: string
    f1Score: string
    analyzed: string
    adminPanel: string
    adminDescription: string
    activeUsers: string
    transactionsToReview: string
    aiAlerts: string
    userManagement: string
    manageRoles: string
    roleUpdated: string
    userId: string
    kycStatus: string
    kybStatus: string
    documentsCount: string
    fraudMonitoring: string
    pagination: string
    previous: string
    next: string
    riskLevel: string
    mainReason: string
    senderName: string
    recipientName: string
    trustScoreRecalculated: string
    ocrData: string
    controlAlerts: string
    validity: string
    readability: string
    trustImpact: string
    enterpriseRisk: string
    falsification: string
    secure: string
    fast: string
    panafrican: string
    createAccount: string
    alreadyAccount: string
    forgotPassword: string
    resetPassword: string
    login: string
    register: string
    emailLabel: string
    passwordLabel: string
    confirmPassword: string
    newPassword: string
    tokenLabel: string
    sendLink: string
    backToLogin: string
    noAccountQuestion: string
    createAccountLink: string
    forgotPasswordLink: string
    resetPasswordTitle: string
    chooseNewPassword: string
    tokenSent: string
    passwordResetSuccess: string
    backToLoginLink: string
    registerTitle: string
    joinPlatform: string
    successMessage: string
    successRedirect: string
    lastNameLabel: string
    firstNameLabelRegister: string
    lastNameLabelRegister: string
    addressLabelRegister: string
    cityLabelRegister: string
    postalCodeLabelRegister: string
    countryLabelRegister: string
    cinLabelRegister: string
    phoneLabelRegister: string
    emailLabelRegister: string
    passwordLabelRegister: string
    confirmPasswordLabel: string
    createAccountButton: string
    alreadyHaveAccount: string
    loginLink: string
    dateOfBirthLabel: string
    accountTypeLabel: string
    individualType: string
    merchantType: string
    adminType: string
    securePlatform: string
    fastPayments: string
    panAfricanNetwork: string
    securedBy: string
    welcomeBack: string
    contentDeRevoir: string
    firstNameLabel: string
    lastNameLabel: string
    addressLabel: string
    cityLabel: string
    postalCodeLabel: string
    countryLabel: string
    cinLabel: string
    phoneLabel: string
    birthDate: string
    accountType: string
    userType: string
    requiredDocuments: string
    submittedDocuments: string
    add: string
    uploading: string
    verifyIdentity: string
    submitDocuments: string
    submitCompanyDocs: string
    myProfile: string
    managePersonalInfo: string
    personalInfoSaved: string
    personalInfoRequired: string
    invalidEmail: string
    savePersonalInfo: string
    profilePhoto: string
    profilePhotoHint: string
    changePhoto: string
    profileImageTypeError: string
    profileImageSizeError: string
    profileImageUploadError: string
    addressSaved: string
    saving: string
    saveAddress: string
    sirenNif: string
    tradeRegister: string
    companyAddress: string
    number: string
    myWallet: string
    viewBalanceLimits: string
    currentBalance: string
    noWallet: string
    completeVerification: string
    chooseVerificationType: string
    kycVerification: string
    kybVerification: string
    verificationType: string
    idCardOrPassport: string
    frontAndBack: string
    documentTypePrompt: string
    photoId: string
    deleteKycRequest: string
    deleteKycRequestAria: string
    reactivateAndRestartVerification: string
    reactivateBeforeDate: string
    cannotLoadDocuments: string
    cannotRecalculateTrustScore: string
    cannotDeleteRequest: string
    cannotReactivateAccount: string
    uploadError: string
    kybUploadError: string
    displayCurrency: string
    accountSecurity: string
    securityVerificationInfo: string
    errorLoadingUsers: string
    errorUpdatingRole: string
    user: string
    detail: string
    noFraudAlerts: string
    nonCompliantTransactionsAppear: string
    aiScore: string
    unknownSender: string
    unknownRecipient: string
    cannotLoadFraudAlerts: string
    backToList: string
    accountStatusLabel: string
    reactivationUntilDate: string
    noKycDocuments: string
    noKybDocuments: string
    rejectionReasonLabel: string
    blockReasonPrompt: string
    deleteAccountConfirm: string
    permanentDeleteConfirm: string
    errorLoading: string
    errorValidation: string
    errorAccountManagement: string
    accountCreatedSuccess: string
    enterEmailForReset: string
    emailPlaceholder: string
    passwordPlaceholder: string
    resetAction: string
    resetImpossible: string
    loginButton: string
    validationError: string
    loginFailed: string
    firstNamePlaceholder: string
    lastNamePlaceholder: string
    addressPlaceholder: string
    cityPlaceholder: string
    postalCodePlaceholder: string
    countryPlaceholder: string
    cinPlaceholder: string
    phonePlaceholder: string
    cannotReachServer: string
    registrationFailed: string
    cannotSendResetLink: string
    unknownError: string
    temporaryTrustScore: string
    calculating: string
    riskLabel: string
    documentsAndAlerts: string
    analysisNotAvailable: string
    autoAnalysisResult: string
    valid: string
    toVerify: string
    notCalculated: string
    hidePassword: string
    showPassword: string
    searchPlaceholder: string
    unread: string
    paysmart: string
    paysmartHome: string
    transactionHistory: string
    viewLastTransactions: string
    analyticsReporting: string
    welcomeMessage: string
    loadingAnalyticsData: string
    realTimeConsolidatedData: string
    volumesByPaymentMethod: string
    apiMetricsEndpoint: string
    cannotLoadPayments: string
    phoneDigitsOnly: string
    accountDigitsOnly: string
    recipientNotFound: string
    paymentCreated: string
    paymentConfirmedLedger: string
    paymentFailed: string
    paymentConfirmed2fa: string
    paymentStatus: string
    invalid2faCode: string
    receiptTitle: string
    receiptReference: string
    receiptAmount: string
    receiptChannel: string
    receiptStatus: string
    receiptDate: string
    transactionStatus: string
    transactionDetails: string
    amount: string
    direction: string
    qrDataLabel: string
    qrScanConfirmed: string
    qrConfirmationSent: string
    temporaryIbanLabel: string
    recipientPhoneNumber: string
    recipientAccountNumber: string
    searchButton: string
    refreshPayments: string
    recipientSearchHelper: string
    qrDynamicReady: string
    temporaryIbanInfo: string
    bankReferenceLabel: string
    bankReferencePlaceholder: string
    cannotInitiatePayment: string
    cannotConfirmQr: string
    qrConfirmation: string
    qrConfirmationDescription: string
    confirmQr: string
    qrConfirmedByRecipient: string
    onlyRecipientCanConfirm: string
    processing: string
    transactionNotFound: string
    documentNonCompliant: string
    pending: string
    verificationKycKyb: string
    verificationKyc: string
    closeMenu: string
    openMenu: string
    navigationMain: string
    inProgress: string
    completed: string
    failed: string
    twoFactorExpiresIn: string
  }
}

export const translations: Record<Language, Translations> = {
  fr: {
    common: {
      loading: 'Chargement...',
      noData: 'Aucune donnée',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      back: 'Retour',
      settings: 'Paramètres',
      notifications: 'Notifications',
      security: 'Sécurité',
      language: 'Langue',
      currency: 'Devise',
      profile: 'Profil',
      wallet: 'Portefeuille',
      payments: 'Paiements',
      dashboard: 'Tableau de bord',
      verification: 'Vérification',
      users: 'Utilisateurs',
      fraudAlerts: 'Alertes fraude',
      logout: 'Déconnexion',
      status: 'Statut',
      actions: 'Actions',
      amount: 'Montant',
      date: 'Date',
      description: 'Description',
      recipient: 'Destinataire',
      sender: 'Expéditeur',
      account: 'Compte',
      balance: 'Solde',
      limits: 'Limites',
      documents: 'Documents',
      submit: 'Soumettre',
      required: 'Requis',
      optional: 'Optionnel',
      noDocuments: 'Aucun document',
      noTransactions: 'Aucune transaction',
      noAlerts: 'Aucune alerte',
      noNotifications: 'Aucune notification',
      openAction: 'Ouvrir',
      welcome: 'Bienvenue',
      overview: 'Vue d\'ensemble',
      analytics: 'Analytics',
      reporting: 'Reporting',
      volume: 'Volume financier',
      transactions: 'Transactions',
      fraudRate: 'Taux de fraude',
      revenue: 'Revenus nets',
      dailyLimit: 'Limite journalière',
      monthlyLimit: 'Limite mensuelle',
      walletNumber: 'Numéro de portefeuille',
      accountNumber: 'Numéro de compte',
      cardholder: 'Titulaire',
      expiry: 'Expiration',
      search: 'Rechercher',
      refresh: 'Actualiser',
      exportCSV: 'Export CSV',
      exportPDF: 'Export PDF',
      print: 'Imprimer',
      downloadReceipt: 'Télécharger le reçu',
      confirmPayment: 'Confirmer le paiement',
      twoFactorCode: 'Code de vérification',
      codeReceived: 'Code reçu dans vos notifications',
      token: 'Token',
      iban: 'IBAN',
      reference: 'Référence',
      channel: 'Canal',
      operator: 'Opérateur',
      mode: 'Mode',
      bankTransfer: 'Virement',
      mobileMoney: 'Mobile Money',
      card: 'Carte bancaire',
      qrCode: 'QR Code',
      review: 'Révision',
      approve: 'Valider',
      reject: 'Rejeter',
      suspend: 'Bloquer',
      reactivate: 'Réactiver',
      permanentlyDelete: 'Supprimer définitivement',
      cancelDeletion: 'Annuler la suppression',
      reactivationDeadline: 'Date limite de réactivation',
      accountStatus: 'Statut du compte',
      riskScore: 'Score IA',
      trustScore: 'Trust Score',
      recommendation: 'Recommandation',
      documentsAnalyzed: 'Documents analysés',
      alerts: 'Alertes',
      noScore: 'Aucun score calculé',
      recalculate: 'Recalculer',
      validation: 'Validation',
      rejectionReason: 'Motif de rejet',
      firstName: 'Prénom',
      lastName: 'Nom',
      email: 'Email',
      phone: 'Téléphone',
      cin: 'CIN',
      dateOfBirth: 'Date de naissance',
      address: 'Adresse',
      city: 'Ville',
      country: 'Pays',
      postalCode: 'Code postal',
      role: 'Rôle',
      company: 'Entreprise',
      personalInfo: 'Informations personnelles',
      addressInfo: 'Adresse',
      companyInfo: 'Informations entreprise',
      walletInfo: 'Informations portefeuille',
      verificationStatus: 'Statut de vérification',
      kyc: 'KYC',
      kyb: 'KYB',
      idCard: 'Carte d\'identité',
      passport: 'Passeport',
      addressProof: 'Justificatif d\'adresse',
      kbis: 'KBIS',
      nif: 'NIF',
      rib: 'RIB',
      front: 'Recto',
      back: 'Verso',
      temporaryIban: 'IBAN temporaire',
      qrData: 'Données QR',
      metadata: 'Métadonnées',
      details: 'Détails',
      history: 'Historique',
      lastTransactions: 'Dernières transactions',
      sendPayment: 'Envoyer un paiement',
      recipientAccount: 'Compte destinataire',
      phoneNumber: 'Numéro de téléphone',
      amountLabel: 'Montant',
      searchRecipient: 'Rechercher le destinataire',
      recipientInfo: 'Information destinataire',
      paymentMode: 'Mode de paiement',
      selectOperator: 'Sélectionner',
      cardToken: 'Token de carte bancaire',
      generateToken: 'Générer',
      payNow: 'Payer maintenant',
      paymentAuthorized: 'Paiement autorisé uniquement vers un compte existant et vérifié',
      sandboxToken: 'Un token sandbox unique sera créé automatiquement pour ce paiement',
      performance: 'Performance IA',
      channels: 'Canaux',
      channelsDescription: 'Répartition des flux financiers consolidés',
      aiMetrics: 'Métriques IA',
      metricsDescription: 'Données de performance du modèle',
      precision: 'Précision',
      recall: 'Rappel',
      f1Score: 'F1-score',
      analyzed: 'Analysées',
      adminPanel: 'Panneau d\'administration',
      adminDescription: 'Supervision des utilisateurs, transactions et alertes IA',
      activeUsers: 'Utilisateurs actifs',
      transactionsToReview: 'Transactions à vérifier',
      aiAlerts: 'Alertes IA ouvertes',
      userManagement: 'Gestion des utilisateurs',
      manageRoles: 'Gérez les rôles et les accès des utilisateurs de la plateforme',
      roleUpdated: 'Rôle mis à jour',
      userId: 'ID: {{id}}',
      kycStatus: 'KYC',
      kybStatus: 'KYB',
      documentsCount: 'Documents',
      fraudMonitoring: 'Suivi des transactions signalées par l\'analyse IA',
      pagination: 'Pagination des alertes fraude',
      previous: 'Précédent',
      next: 'Suivant',
      riskLevel: 'Niveau de risque',
      mainReason: 'Motif principal',
      senderName: 'Expéditeur',
      recipientName: 'Destinataire',
      trustScoreRecalculated: 'Score recalculé à partir des contrôles disponibles',
      ocrData: 'Données extraites par OCR',
      controlAlerts: 'Alertes de contrôle',
      validity: 'Validité',
      readability: 'Lisibilité / confiance',
      trustImpact: 'Impact Trust Score',
      enterpriseRisk: 'Risque entreprise',
      falsification: 'Falsification',
      secure: 'Sécurisé',
      fast: 'Rapide',
      panafrican: 'Panafricain',
      createAccount: 'Créer un compte',
      alreadyAccount: 'Vous n\'avez pas de compte ?',
      forgotPassword: 'Mot de passe oublié',
      resetPassword: 'Réinitialiser le mot de passe',
      login: 'Connexion',
      register: 'Inscription',
      emailLabel: 'Email',
      passwordLabel: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      newPassword: 'Nouveau mot de passe',
      tokenLabel: 'Token',
      sendLink: 'Envoyer le lien',
      backToLogin: 'Retour à la connexion',
      noAccountQuestion: 'Vous n\'avez pas de compte ?',
      createAccountLink: 'Créer un compte',
      forgotPasswordLink: 'Mot de passe oublié ?',
      resetPasswordTitle: 'Réinitialiser le mot de passe',
      chooseNewPassword: 'Choisissez un nouveau mot de passe sécurisé',
      tokenSent: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé',
      passwordResetSuccess: 'Votre mot de passe a été réinitialisé avec succès',
      backToLoginLink: 'Retour à la connexion',
      registerTitle: 'Créer un compte',
      joinPlatform: 'Rejoignez la plateforme de paiement Paysmart',
      successMessage: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter',
      successRedirect: 'Compte créé avec succès ! Redirection vers la connexion',
      lastNameLabel: 'Nom',
      firstNameLabelRegister: 'Prénom',
      lastNameLabelRegister: 'Nom',
      addressLabelRegister: 'Adresse',
      cityLabelRegister: 'Ville',
      postalCodeLabelRegister: 'Code postal',
      countryLabelRegister: 'Pays',
      cinLabelRegister: 'CIN',
      phoneLabelRegister: 'Téléphone',
      emailLabelRegister: 'Email',
      passwordLabelRegister: 'Mot de passe',
      confirmPasswordLabel: 'Confirmer le mot de passe',
      createAccountButton: 'Créer un compte',
      alreadyHaveAccount: 'Vous avez déjà un compte ?',
      loginLink: 'Se connecter',
      dateOfBirthLabel: 'Date de naissance',
      accountTypeLabel: 'Type de compte',
      individualType: 'Particulier',
      merchantType: 'Marchand',
      adminType: 'Administrateur',
      securePlatform: 'La plateforme de paiement sécurisée pour vos transactions en Afrique',
      fastPayments: 'Rapide',
      panAfricanNetwork: 'Panafricain',
      securedBy: 'Sécurisé',
      welcomeBack: 'Content de vous revoir sur Paysmart',
      contentDeRevoir: 'Content de vous revoir sur Paysmart',
      firstNameLabel: 'Prénom',
      lastNameLabel: 'Nom',
      addressLabel: 'Adresse',
      cityLabel: 'Ville',
      postalCodeLabel: 'Code postal',
      countryLabel: 'Pays',
      cinLabel: 'CIN',
      phoneLabel: 'Téléphone',
      birthDate: 'Date de naissance',
      accountType: 'Type de compte',
      userType: 'Type d\'utilisateur',
      requiredDocuments: 'Documents requis',
      submittedDocuments: 'Documents soumis',
      add: 'Ajouter',
      uploading: 'Envoi...',
      verifyIdentity: 'Vérifier l\'identité',
      submitDocuments: 'Soumettre les documents',
      submitCompanyDocs: 'Soumettre les documents entreprise',
      myProfile: 'Mon Profil',
      managePersonalInfo: 'Gérez vos informations personnelles et vos documents',
      personalInfoSaved: 'Informations personnelles enregistrées.',
      personalInfoRequired: 'Le prénom, le nom et l’email sont obligatoires.',
      invalidEmail: 'Veuillez saisir une adresse email valide.',
      savePersonalInfo: 'Enregistrer les informations',
      profilePhoto: 'Photo de profil',
      profilePhotoHint: 'JPG, PNG ou WEBP, 5 Mo maximum.',
      changePhoto: 'Modifier la photo',
      profileImageTypeError: 'Veuillez choisir une image JPG, PNG ou WEBP.',
      profileImageSizeError: 'La photo ne doit pas dépasser 5 Mo.',
      profileImageUploadError: 'Impossible de modifier la photo.',
      addressSaved: 'Adresse enregistrée.',
      saving: 'Enregistrement...',
      saveAddress: 'Enregistrer l\'adresse',
      sirenNif: 'SIREN / NIF',
      tradeRegister: 'Registre de commerce',
      companyAddress: 'Adresse entreprise',
      number: 'Numéro',
      myWallet: 'Mon Portefeuille',
      viewBalanceLimits: 'Consultez votre solde et vos limites',
      currentBalance: 'Solde actuel',
      noWallet: 'Aucun portefeuille',
      completeVerification: 'Compléter la vérification',
      chooseVerificationType: 'Choisissez le type de vérification à compléter.',
      kycVerification: 'Vérification KYC',
      kybVerification: 'Vérification KYB',
      verificationType: 'Type de vérification',
      idCardOrPassport: 'Carte d\'identité / Passeport',
      frontAndBack: 'Recto et verso',
      documentTypePrompt: 'Type de document (CIN, PASSPORT, ADDRESS_PROOF, PHOTO_ID):',
      photoId: 'PHOTO_ID',
      deleteKycRequest: 'Supprimer cette demande KYC ?',
      deleteKycRequestAria: 'Supprimer la demande KYC',
      reactivateAndRestartVerification: 'Réactiver et recommencer la vérification',
      reactivateBeforeDate: 'Réactivez-le avant le {{date}} pour recommencer votre vérification.',
      cannotLoadDocuments: 'Impossible de charger les documents',
      cannotRecalculateTrustScore: 'Impossible de recalculer le Trust Score',
      cannotDeleteRequest: 'Impossible de supprimer la demande',
      cannotReactivateAccount: 'Impossible de réactiver le compte',
      uploadError: 'Erreur lors de l\'upload',
      kybUploadError: 'Erreur lors de l\'upload KYB',
      displayCurrency: 'Devise d\'affichage',
      accountSecurity: 'Sécurité du compte',
      securityVerificationInfo: 'La vérification en deux étapes et le changement de mot de passe sont disponibles depuis les flux de sécurité.',
      errorLoadingUsers: 'Erreur lors du chargement des utilisateurs',
      errorUpdatingRole: 'Erreur lors de la mise à jour du rôle',
      user: 'Utilisateur',
      detail: 'Détail',
      noFraudAlerts: 'Aucune alerte de fraude en cours',
      nonCompliantTransactionsAppear: 'Les transactions non conformes apparaîtront ici dès que l\'IA les détecte.',
      aiScore: 'Score IA',
      unknownSender: 'Expéditeur inconnu',
      unknownRecipient: 'Destinataire inconnu',
      cannotLoadFraudAlerts: 'Impossible de charger les alertes de fraude',
      backToList: 'Retour à la liste',
      accountStatusLabel: 'Compte : {{status}}',
      reactivationUntilDate: 'Réactivation jusqu\'au {{date}}',
      noKycDocuments: 'Aucun document KYC',
      noKybDocuments: 'Aucun document KYB',
      rejectionReasonLabel: 'Motif: {{reason}}',
      blockReasonPrompt: 'Motif du blocage :',
      deleteAccountConfirm: 'Supprimer ce compte ? Une réactivation sera possible pendant 30 jours.',
      permanentDeleteConfirm: 'Supprimer définitivement ce compte ?',
      errorLoading: 'Erreur lors du chargement',
      errorValidation: 'Erreur lors de la validation',
      errorAccountManagement: 'Erreur lors de la gestion du compte',
      accountCreatedSuccess: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
      enterEmailForReset: 'Entrez votre email pour recevoir un lien de réinitialisation.',
      emailPlaceholder: 'vous@exemple.com',
      passwordPlaceholder: '••••••••',
      resetAction: 'Réinitialiser',
      resetImpossible: 'Réinitialisation impossible',
      loginButton: 'Se connecter',
      validationError: 'Erreur de validation',
      loginFailed: 'Échec de la connexion',
      firstNamePlaceholder: 'Jean',
      lastNamePlaceholder: 'Dupont',
      addressPlaceholder: '12 rue des Fleurs',
      cityPlaceholder: 'Dakar',
      postalCodePlaceholder: '10000',
      countryPlaceholder: 'Sénégal',
      cinPlaceholder: '123456789',
      phonePlaceholder: '+221 77 123 45 67',
      cannotReachServer: 'Impossible de joindre le serveur. Démarrez le backend sur le port 3000 puis réessayez.',
      registrationFailed: 'Échec de l\'inscription',
      cannotSendResetLink: 'Impossible d\'envoyer le lien de réinitialisation',
      unknownError: 'Erreur inconnue',
      temporaryTrustScore: 'Trust Score temporaire',
      calculating: 'Calcul...',
      riskLabel: 'Risque : {{risk}}',
      documentsAndAlerts: 'Documents analysés : {{docs}} · Alertes : {{alerts}}',
      analysisNotAvailable: 'Analyse non disponible pour ce document.',
      autoAnalysisResult: 'Résultat de l\'analyse automatique',
      valid: 'Valide',
      toVerify: 'À vérifier',
      notCalculated: 'Non calculé',
      hidePassword: 'Masquer le mot de passe',
      showPassword: 'Afficher le mot de passe',
      searchPlaceholder: 'Rechercher...',
      unread: 'Non lu',
      paysmart: 'Paysmart',
      paysmartHome: 'Paysmart, accueil',
      transactionHistory: 'Historique des transactions',
      viewLastTransactions: 'Consultez vos dernières transactions',
      analyticsReporting: 'Analytics & Reporting',
      welcomeMessage: 'Bienvenue, {{name}} ! Voici les indicateurs de votre activité.',
      loadingAnalyticsData: 'Chargement des données Analytics...',
      realTimeConsolidatedData: 'Données consolidées en temps réel',
      volumesByPaymentMethod: 'Volumes par méthode de paiement',
      apiMetricsEndpoint: 'GET /api/v1/metrics',
      cannotLoadPayments: 'Impossible de charger les paiements',
      phoneDigitsOnly: 'Le numéro de téléphone doit contenir uniquement des chiffres',
      accountDigitsOnly: 'Le numéro de compte doit contenir uniquement des chiffres',
      recipientNotFound: 'Compte destinataire introuvable',
      paymentCreated: 'Paiement {{reference}} créé. Statut : {{status}}.',
      paymentConfirmedLedger: 'Paiement confirmé et enregistré dans le ledger.',
      paymentFailed: 'Paiement échoué : {{reason}}',
      paymentConfirmed2fa: 'Paiement confirmé après vérification 2FA.',
      paymentStatus: 'Paiement {{status}}.',
      invalid2faCode: 'Code 2FA invalide ou expiré',
      receiptTitle: 'PAYSMART - RECU DE PAIEMENT',
      receiptReference: 'Reference: {{ref}}',
      receiptAmount: 'Montant: {{amount}} {{currency}}',
      receiptChannel: 'Canal: {{channel}}',
      receiptStatus: 'Statut: {{status}}',
      receiptDate: 'Date: {{date}}',
      transactionStatus: 'Transaction {{ref}} : {{status}}',
      transactionDetails: 'Détails de la transaction',
      amount: 'Montant',
      direction: 'Direction',
      qrDataLabel: 'QR : {{data}}',
      temporaryIbanLabel: 'IBAN temporaire : {{iban}}',
      recipientPhoneNumber: 'Numéro de téléphone destinataire',
      recipientAccountNumber: 'Numéro du compte destinataire',
      searchButton: 'Rechercher',
      refreshPayments: 'Actualiser les paiements',
      recipientSearchHelper: 'Le compte destinataire est recherché avec ce numéro. Les opérateurs sont proposés ci-dessus.',
      qrDynamicReady: 'QR dynamique prêt à être généré pour le compte {{wallet}}.',
      qrScanConfirmed: 'J\'ai scanné le QR code',
      qrConfirmationSent: 'Le lien de confirmation QR a été envoyé au destinataire.',
      temporaryIbanInfo: 'Un IBAN temporaire et une référence seront associés à ce virement.',
      bankReferenceLabel: 'Référence bancaire (optionnel)',
      bankReferencePlaceholder: 'Référence du virement',
      cannotInitiatePayment: 'Impossible d\'initier le paiement',
      cannotConfirmQr: 'Impossible de confirmer le QR',
      qrConfirmation: 'Confirmation du paiement QR',
      qrConfirmationDescription: 'Vous êtes sur le point de confirmer la demande de paiement reçue par QR code.',
      confirmQr: 'Confirmer le paiement QR',
      qrConfirmedByRecipient: 'Paiement QR confirmé pour la transaction {{ref}}.',
      onlyRecipientCanConfirm: 'Seul le destinataire connecté peut confirmer cette demande.',
      processing: 'En cours',
      transactionNotFound: 'Transaction non trouvée',
      documentNonCompliant: 'Document non conforme',
      pending: 'En attente',
      verificationKycKyb: 'Vérification KYC / KYB',
      verificationKyc: 'Vérification KYC',
      closeMenu: 'Fermer le menu',
      openMenu: 'Ouvrir le menu',
      navigationMain: 'Navigation principale',
      inProgress: 'Traitement',
      completed: 'Terminé',
      failed: 'Échoué',
      twoFactorExpiresIn: 'Expire dans {{seconds}}s',
      paymentCancelled: 'Paiement annulé',
      cannotCancelPayment: 'Impossible d’annuler le paiement',
      cancelPayment: 'Annuler le paiement',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      noData: 'No data',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      settings: 'Settings',
      notifications: 'Notifications',
      security: 'Security',
      language: 'Language',
      currency: 'Currency',
      profile: 'Profile',
      wallet: 'Wallet',
      payments: 'Payments',
      dashboard: 'Dashboard',
      verification: 'Verification',
      users: 'Users',
      fraudAlerts: 'Fraud alerts',
      logout: 'Logout',
      status: 'Status',
      actions: 'Actions',
      amount: 'Amount',
      date: 'Date',
      description: 'Description',
      recipient: 'Recipient',
      sender: 'Sender',
      account: 'Account',
      balance: 'Balance',
      limits: 'Limits',
      documents: 'Documents',
      submit: 'Submit',
      required: 'Required',
      optional: 'Optional',
      noDocuments: 'No documents',
      noTransactions: 'No transactions',
      noAlerts: 'No alerts',
      noNotifications: 'No notifications',
      openAction: 'Open',
      welcome: 'Welcome',
      overview: 'Overview',
      analytics: 'Analytics',
      reporting: 'Reporting',
      volume: 'Financial volume',
      transactions: 'Transactions',
      fraudRate: 'Fraud rate',
      revenue: 'Net revenue',
      dailyLimit: 'Daily limit',
      monthlyLimit: 'Monthly limit',
      walletNumber: 'Wallet number',
      accountNumber: 'Account number',
      cardholder: 'Cardholder',
      expiry: 'Expiry',
      search: 'Search',
      refresh: 'Refresh',
      exportCSV: 'Export CSV',
      exportPDF: 'Export PDF',
      print: 'Print',
      downloadReceipt: 'Download receipt',
      confirmPayment: 'Confirm payment',
      twoFactorCode: 'Verification code',
      codeReceived: 'Code received in your notifications',
      token: 'Token',
      iban: 'IBAN',
      reference: 'Reference',
      channel: 'Channel',
      operator: 'Operator',
      mode: 'Mode',
      bankTransfer: 'Bank transfer',
      mobileMoney: 'Mobile Money',
      card: 'Card',
      qrCode: 'QR Code',
      review: 'Review',
      approve: 'Approve',
      reject: 'Reject',
      suspend: 'Suspend',
      reactivate: 'Reactivate',
      permanentlyDelete: 'Permanently delete',
      cancelDeletion: 'Cancel deletion',
      reactivationDeadline: 'Reactivation deadline',
      accountStatus: 'Account status',
      riskScore: 'AI Score',
      trustScore: 'Trust Score',
      recommendation: 'Recommendation',
      documentsAnalyzed: 'Documents analyzed',
      alerts: 'Alerts',
      noScore: 'No score calculated yet',
      recalculate: 'Recalculate',
      validation: 'Validation',
      rejectionReason: 'Rejection reason',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      cin: 'ID number',
      dateOfBirth: 'Date of birth',
      address: 'Address',
      city: 'City',
      country: 'Country',
      postalCode: 'Postal code',
      role: 'Role',
      company: 'Company',
      personalInfo: 'Personal information',
      addressInfo: 'Address',
      companyInfo: 'Company information',
      walletInfo: 'Wallet information',
      verificationStatus: 'Verification status',
      kyc: 'KYC',
      kyb: 'KYB',
      idCard: 'ID card',
      passport: 'Passport',
      addressProof: 'Proof of address',
      kbis: 'KBIS',
      nif: 'NIF',
      rib: 'RIB',
      front: 'Front',
      back: 'Back',
      temporaryIban: 'Temporary IBAN',
      qrData: 'QR data',
      metadata: 'Metadata',
      details: 'Details',
      history: 'History',
      lastTransactions: 'Last transactions',
      sendPayment: 'Send payment',
      recipientAccount: 'Recipient account',
      phoneNumber: 'Phone number',
      amountLabel: 'Amount',
      searchRecipient: 'Search recipient',
      recipientInfo: 'Recipient information',
      paymentMode: 'Payment mode',
      selectOperator: 'Select',
      cardToken: 'Card token',
      generateToken: 'Generate',
      payNow: 'Pay now',
      paymentAuthorized: 'Payment is only authorized to an existing and verified account',
      sandboxToken: 'A unique sandbox token will be automatically created for this payment',
      performance: 'AI performance',
      channels: 'Channels',
      channelsDescription: 'Consolidated financial flows breakdown',
      aiMetrics: 'AI Metrics',
      metricsDescription: 'Model performance data',
      precision: 'Precision',
      recall: 'Recall',
      f1Score: 'F1-score',
      analyzed: 'Analyzed',
      adminPanel: 'Admin panel',
      adminDescription: 'Supervision of users, transactions and AI alerts',
      activeUsers: 'Active users',
      transactionsToReview: 'Transactions to review',
      aiAlerts: 'Open AI alerts',
      userManagement: 'User management',
      manageRoles: 'Manage roles and access of platform users',
      roleUpdated: 'Role updated',
      userId: 'ID: {{id}}',
      kycStatus: 'KYC',
      kybStatus: 'KYB',
      documentsCount: 'Documents',
      fraudMonitoring: 'Monitoring of transactions flagged by AI analysis',
      pagination: 'Fraud alerts pagination',
      previous: 'Previous',
      next: 'Next',
      riskLevel: 'Risk level',
      mainReason: 'Main reason',
      senderName: 'Sender',
      recipientName: 'Recipient',
      trustScoreRecalculated: 'Score recalculated from available checks',
      ocrData: 'Data extracted by OCR',
      controlAlerts: 'Control alerts',
      validity: 'Validity',
      readability: 'Readability / confidence',
      trustImpact: 'Trust Score impact',
      enterpriseRisk: 'Enterprise risk',
      falsification: 'Falsification',
      secure: 'Secure',
      fast: 'Fast',
      panafrican: 'Panafrican',
      createAccount: 'Create account',
      alreadyAccount: 'Don\'t have an account?',
      forgotPassword: 'Forgot password',
      resetPassword: 'Reset password',
      login: 'Login',
      register: 'Register',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      confirmPassword: 'Confirm password',
      newPassword: 'New password',
      tokenLabel: 'Token',
      sendLink: 'Send link',
      backToLogin: 'Back to login',
      noAccountQuestion: 'Don\'t have an account?',
      createAccountLink: 'Create an account',
      forgotPasswordLink: 'Forgot password?',
      resetPasswordTitle: 'Reset password',
      chooseNewPassword: 'Choose a new secure password',
      tokenSent: 'If an account exists for this email, a reset link has been sent',
      passwordResetSuccess: 'Your password has been successfully reset',
      backToLoginLink: 'Back to login',
      registerTitle: 'Create account',
      joinPlatform: 'Join the Paysmart payment platform',
      successMessage: 'Account created successfully! You can now log in',
      successRedirect: 'Account created successfully! Redirecting to login',
      lastNameLabel: 'Last name',
      firstNameLabelRegister: 'First name',
      lastNameLabelRegister: 'Last name',
      addressLabelRegister: 'Address',
      cityLabelRegister: 'City',
      postalCodeLabelRegister: 'Postal code',
      countryLabelRegister: 'Country',
      cinLabelRegister: 'ID number',
      phoneLabelRegister: 'Phone',
      emailLabelRegister: 'Email',
      passwordLabelRegister: 'Password',
      confirmPasswordLabel: 'Confirm password',
      createAccountButton: 'Create account',
      alreadyHaveAccount: 'Already have an account?',
      loginLink: 'Sign in',
      dateOfBirthLabel: 'Date of birth',
      accountTypeLabel: 'Account type',
      individualType: 'Individual',
      merchantType: 'Merchant',
      adminType: 'Administrator',
      securePlatform: 'The secure payment platform for your transactions in Africa',
      fastPayments: 'Fast',
      panAfricanNetwork: 'Panafrican',
      securedBy: 'Secured',
      welcomeBack: 'Good to see you again on Paysmart',
      contentDeRevoir: 'Good to see you again on Paysmart',
      firstNameLabel: 'First name',
      lastNameLabel: 'Last name',
      addressLabel: 'Address',
      cityLabel: 'City',
      postalCodeLabel: 'Postal code',
      countryLabel: 'Country',
      cinLabel: 'ID number',
      phoneLabel: 'Phone',
      birthDate: 'Date of birth',
      accountType: 'Account type',
      userType: 'User type',
      requiredDocuments: 'Required documents',
      submittedDocuments: 'Submitted documents',
      add: 'Add',
      uploading: 'Uploading...',
      verifyIdentity: 'Verify identity',
      submitDocuments: 'Submit documents',
      submitCompanyDocs: 'Submit company documents',
      myProfile: 'My Profile',
      managePersonalInfo: 'Manage your personal information and documents',
      personalInfoSaved: 'Personal information saved.',
      personalInfoRequired: 'First name, last name, and email are required.',
      invalidEmail: 'Please enter a valid email address.',
      savePersonalInfo: 'Save personal information',
      profilePhoto: 'Profile photo',
      profilePhotoHint: 'JPG, PNG or WEBP, maximum 5 MB.',
      changePhoto: 'Change photo',
      profileImageTypeError: 'Please choose a JPG, PNG, or WEBP image.',
      profileImageSizeError: 'The photo must not exceed 5 MB.',
      profileImageUploadError: 'Unable to update the photo.',
      addressSaved: 'Address saved.',
      saving: 'Saving...',
      saveAddress: 'Save address',
      sirenNif: 'SIREN / NIF',
      tradeRegister: 'Trade register',
      companyAddress: 'Company address',
      number: 'Number',
      myWallet: 'My Wallet',
      viewBalanceLimits: 'Check your balance and limits',
      currentBalance: 'Current balance',
      noWallet: 'No wallet',
      completeVerification: 'Complete verification',
      chooseVerificationType: 'Choose the type of verification to complete.',
      kycVerification: 'KYC Verification',
      kybVerification: 'KYB Verification',
      verificationType: 'Verification type',
      idCardOrPassport: 'ID card / Passport',
      frontAndBack: 'Front and back',
      documentTypePrompt: 'Document type (CIN, PASSPORT, ADDRESS_PROOF, PHOTO_ID):',
      photoId: 'PHOTO_ID',
      deleteKycRequest: 'Delete this KYC request?',
      deleteKycRequestAria: 'Delete KYC request',
      reactivateAndRestartVerification: 'Reactivate and restart verification',
      reactivateBeforeDate: 'Reactivate before {{date}} to restart your verification.',
      cannotLoadDocuments: 'Unable to load documents',
      cannotRecalculateTrustScore: 'Unable to recalculate Trust Score',
      cannotDeleteRequest: 'Unable to delete request',
      cannotReactivateAccount: 'Unable to reactivate account',
      uploadError: 'Error during upload',
      kybUploadError: 'Error during KYB upload',
      displayCurrency: 'Display currency',
      accountSecurity: 'Account security',
      securityVerificationInfo: 'Two-factor verification and password change are available in the security flows.',
      errorLoadingUsers: 'Error loading users',
      errorUpdatingRole: 'Error updating role',
      user: 'User',
      detail: 'Detail',
      noFraudAlerts: 'No fraud alerts currently',
      nonCompliantTransactionsAppear: 'Non-compliant transactions will appear here as soon as AI detects them.',
      aiScore: 'AI Score',
      unknownSender: 'Unknown sender',
      unknownRecipient: 'Unknown recipient',
      cannotLoadFraudAlerts: 'Unable to load fraud alerts',
      backToList: 'Back to list',
      accountStatusLabel: 'Account: {{status}}',
      reactivationUntilDate: 'Reactivation until {{date}}',
      noKycDocuments: 'No KYC documents',
      noKybDocuments: 'No KYB documents',
      rejectionReasonLabel: 'Reason: {{reason}}',
      blockReasonPrompt: 'Reason for blocking:',
      deleteAccountConfirm: 'Delete this account? Reactivation will be possible for 30 days.',
      permanentDeleteConfirm: 'Permanently delete this account?',
      errorLoading: 'Error loading',
      errorValidation: 'Error during validation',
      errorAccountManagement: 'Error managing account',
      accountCreatedSuccess: 'Account created successfully! You can now log in.',
      enterEmailForReset: 'Enter your email to receive a reset link.',
      emailPlaceholder: 'you@example.com',
      passwordPlaceholder: '••••••••',
      resetAction: 'Reset',
      resetImpossible: 'Reset impossible',
      loginButton: 'Sign in',
      validationError: 'Validation error',
      loginFailed: 'Login failed',
      firstNamePlaceholder: 'John',
      lastNamePlaceholder: 'Doe',
      addressPlaceholder: '12 Flower Street',
      cityPlaceholder: 'Dakar',
      postalCodePlaceholder: '10000',
      countryPlaceholder: 'Senegal',
      cinPlaceholder: '123456789',
      phonePlaceholder: '+221 77 123 45 67',
      cannotReachServer: 'Cannot reach server. Start the backend on port 3000 and try again.',
      registrationFailed: 'Registration failed',
      cannotSendResetLink: 'Unable to send reset link',
      unknownError: 'Unknown error',
      temporaryTrustScore: 'Temporary Trust Score',
      calculating: 'Calculating...',
      riskLabel: 'Risk: {{risk}}',
      documentsAndAlerts: 'Documents analyzed: {{docs}} · Alerts: {{alerts}}',
      analysisNotAvailable: 'Analysis not available for this document.',
      autoAnalysisResult: 'Automatic analysis result',
      valid: 'Valid',
      toVerify: 'To verify',
      notCalculated: 'Not calculated',
      hidePassword: 'Hide password',
      showPassword: 'Show password',
      searchPlaceholder: 'Search...',
      unread: 'Unread',
      paysmart: 'Paysmart',
      paysmartHome: 'Paysmart, home',
      transactionHistory: 'Transaction history',
      viewLastTransactions: 'View your latest transactions',
      analyticsReporting: 'Analytics & Reporting',
      welcomeMessage: 'Welcome back, {{name}}! Here are your activity metrics.',
      loadingAnalyticsData: 'Loading Analytics data...',
      realTimeConsolidatedData: 'Real-time consolidated data',
      volumesByPaymentMethod: 'Volumes by payment method',
      apiMetricsEndpoint: 'GET /api/v1/metrics',
      cannotLoadPayments: 'Unable to load payments',
      phoneDigitsOnly: 'Phone number must contain only digits',
      accountDigitsOnly: 'Account number must contain only digits',
      recipientNotFound: 'Recipient account not found',
      paymentCreated: 'Payment {{reference}} created. Status: {{status}}.',
      paymentConfirmedLedger: 'Payment confirmed and recorded in the ledger.',
      paymentFailed: 'Payment failed: {{reason}}',
      paymentConfirmed2fa: 'Payment confirmed after 2FA verification.',
      paymentStatus: 'Payment {{status}}.',
      invalid2faCode: 'Invalid or expired 2FA code',
      receiptTitle: 'PAYSMART - PAYMENT RECEIPT',
      receiptReference: 'Reference: {{ref}}',
      receiptAmount: 'Amount: {{amount}} {{currency}}',
      receiptChannel: 'Channel: {{channel}}',
      receiptStatus: 'Status: {{status}}',
      receiptDate: 'Date: {{date}}',
      transactionStatus: 'Transaction {{ref}}: {{status}}',
      transactionDetails: 'Transaction Details',
      amount: 'Amount',
      direction: 'Direction',
      qrDataLabel: 'QR: {{data}}',
      temporaryIbanLabel: 'Temporary IBAN: {{iban}}',
      recipientPhoneNumber: 'Recipient phone number',
      recipientAccountNumber: 'Recipient account number',
      searchButton: 'Search',
      refreshPayments: 'Refresh payments',
      recipientSearchHelper: 'The recipient account is searched with this number. Operators are proposed above.',
      qrDynamicReady: 'Dynamic QR ready to be generated for account {{wallet}}.',
      qrScanConfirmed: 'I have scanned the QR code',
      qrConfirmationSent: 'The QR confirmation link has been sent to the recipient.',
      temporaryIbanInfo: 'A temporary IBAN and reference will be associated with this transfer.',
      bankReferenceLabel: 'Bank reference (optional)',
      bankReferencePlaceholder: 'Transfer reference',
      cannotInitiatePayment: 'Unable to initiate payment',
      cannotConfirmQr: 'Unable to confirm QR',
      qrConfirmation: 'QR Payment Confirmation',
      qrConfirmationDescription: 'You are about to confirm the payment request received via QR code.',
      confirmQr: 'Confirm QR Payment',
      qrConfirmedByRecipient: 'QR payment confirmed for transaction {{ref}}.',
      onlyRecipientCanConfirm: 'Only the connected recipient can confirm this request.',
      processing: 'Processing',
      transactionNotFound: 'Transaction not found',
      documentNonCompliant: 'Document non-compliant',
      pending: 'Pending',
      verificationKycKyb: 'KYC / KYB Verification',
      verificationKyc: 'KYC Verification',
      closeMenu: 'Close menu',
      openMenu: 'Open menu',
      navigationMain: 'Main navigation',
      inProgress: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
      twoFactorExpiresIn: 'Expires in {{seconds}}s',
      paymentCancelled: 'Payment cancelled',
      cannotCancelPayment: 'Unable to cancel payment',
      cancelPayment: 'Cancel payment',
    },
  },
}

export function useTranslation() {
  const { settings } = useSettings()
  const lang = settings.language
  const locale = lang === 'en' ? 'en-US' : 'fr-FR'

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: unknown = translations[lang]
    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    if (typeof value !== 'string') return key
    if (!params) return value
    return value.replace(/\{\{(\w+)\}\}/g, (_, match) => {
      if (match in params) return String(params[match])
      return `{{${match}}}`
    })
  }

  const tc = (key: string, params?: Record<string, string | number>): string => {
    const direct = t(key, params)
    if (direct !== key) return direct
    const nested = t(`common.${key}`, params)
    return nested !== `common.${key}` ? nested : key
  }

  const formatMoney = (amount: number, sourceCurrency?: string, targetCurrency = settings.currency) => {
    const convertedAmount = convertCurrency(amount, sourceCurrency, targetCurrency)
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(convertedAmount)
    } catch {
      return `${convertedAmount.toLocaleString(locale)} ${targetCurrency}`
    }
  }

  return { t: tc, lang, locale, formatMoney }
}
