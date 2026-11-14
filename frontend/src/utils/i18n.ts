import { useCallback } from 'react'
import { useSettings } from '../contexts/SettingsContext'
import { convertCurrency, formatCurrencySymbol } from './formatters'

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
    withdrawalRequests: string
    requestWithdrawal: string
    withdrawalMethod: string
    withdrawalRecipient: string
    withdrawalDestination: string
    withdrawalBankName: string
    withdrawalNote: string
    withdrawalSubmitted: string
    withdrawalCancelled: string
    withdrawalCountry: string
    noWithdrawalRequests: string
    cancelWithdrawal: string
    withdrawalPending: string
    withdrawalApproved: string
    withdrawalPaid: string
    withdrawalRejected: string
    withdrawalCancelledStatus: string
    withdrawalQueue: string
    withdrawalQueueDescription: string
    withdrawalUser: string
    withdrawalDestinationDetails: string
    withdrawalReviewNote: string
    markWithdrawalPaid: string
    manualPayoutNotice: string
    withdrawalUnavailable: string
    withdrawalAmountInvalid: string
    withdrawalAccount: string
    noAlerts: string
    noNotifications: string
    viewAllNotifications: string
    markAsRead: string
    retry: string
    cannotLoadNotifications: string
    cannotMarkNotificationRead: string
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
    cardNumber: string
    accountNumber: string
    cardholder: string
    expiry: string
    expiryMonth: string
    expiryYear: string
    eur: string
    usd: string
    xof: string
    mga: string
    search: string
    refresh: string
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
    pendingApproval: string
    registrationRejected: string
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
    qrData: string
    metadata: string
    details: string
    history: string
    lastTransactions: string
    sendPayment: string
    recipientAccount: string
    phoneNumber: string
    amountLabel: string
    paymentCurrency: string
    walletDebitAmount: string
    sandboxExchangeRateNotice: string
    searchRecipient: string
    recipientInfo: string
    paymentMode: string
    selectOperator: string
    cardExpiry: string
    cvv: string
    dynamicCvv: string
    dynamicCvvNotice: string
    invalidExpiry: string
    invalidCvv: string
    payNow: string
    paymentFeePreview: string
    calculatingFee: string
    cannotCalculateFee: string
    loadingBalance: string
    cannotLoadBalance: string
    insufficientBalance: string
    performance: string
    channels: string
    channelsDescription: string
    transactionRatesByChannel: string
    allClientsTransactionScope: string
    transactionShare: string
    aiMetrics: string
    metricsDescription: string
    precision: string
    recall: string
    f1Score: string
    analyzed: string
    transactionMetricScope: string
    adminPanel: string
    adminDescription: string
    activeUsers: string
    transactionsToReview: string
    transactionsToReviewDescription: string
    backToDashboard: string
    aiAlerts: string
    collectedTransactionFees: string
    viewDetails: string
    hideDetails: string
    userManagement: string
    viewDocument: string
    close: string
    documentPreviewUnavailable: string
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
    previousYear: string
    nextYear: string
    riskLevel: string
    mainReason: string
    senderName: string
    recipientName: string
    transactionAmount: string
    transactionFee: string
    transactionTotal: string
    recipientReceivesAmount: string
    receiptFee: string
    receiptTotal: string
    profileImageUploaded: string
    securityRules: string
    securityRulesDescription: string
    saveRule: string
    deleteRule: string
    ruleName: string
    ruleType: string
    conditions: string
    actions: string
    priority: string
    active: string
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
    includeAllTransactions: string
    showFraudAlertsOnly: string
    cannotResolveFraudAlert: string
    markFraudReviewed: string
    fraudReviewed: string
    investigateFraudAlert: string
    investigationDetails: string
    previousReviewNotes: string
    accountContext: string
    recentTransactions: string
    transactionOutcome: string
    aiDecision: string
    aiFactors: string
    aiEvidenceUnavailable: string
    fraudOutcomeLabel: string
    selectFraudOutcome: string
    confirmedFraud: string
    legitimateTransaction: string
    fraudOutcomeImpact: string
    internalConclusion: string
    internalConclusionPlaceholder: string
    startInvestigation: string
    resolveAfterInvestigation: string
    legitimateUserCloseHint: string
    investigationProgressSaved: string
    suspendUserConfirm: string
    suspendAccount: string
    suspensionReasonPlaceholder: string
    confirmSuspendAccount: string
    investigationLoadFailed: string
    investigationSaveFailed: string
    accountSuspended: string
    statusOpen: string
    statusInvestigating: string
    statusResolved: string
    transactionFailure: string
    transactionReference: string
    totalDebited: string
    noRecentTransactions: string
    kycStatusLabel: string
    kybStatusLabel: string
    backToList: string
    accountStatusLabel: string
    accountExpirationDate: string
    reactivationUntilDate: string
    noKycDocuments: string
    noKybDocuments: string
    rejectionReasonLabel: string
    blockReasonPrompt: string
    deleteAccountConfirm: string
    permanentDeleteConfirm: string
    deleteAccount: string
    accountDeletionDescription: string
    confirmSelfDeletion: string
    deletionStepOne: string
    deletionStepTwo: string
    continueDeletion: string
    accountDeletionBlocked: string
    accountDeletionScheduled: string
    accountDeletionPending: string
    accountDeletionRecoveryHint: string
    restoreAccount: string
    accountDeletionRestored: string
    accountDeletionExpired: string
    requestAccountDeletion: string
    password: string
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
    hideSensitiveData: string
    showSensitiveData: string
    copySensitiveData: string
    copied: string
    copyFailed: string
    searchPlaceholder: string
    unread: string
    paysmart: string
    paysmartHome: string
    transactionHistory: string
    viewLastTransactions: string
    welcomeMessage: string
    loadingAnalyticsData: string
    realTimeConsolidatedData: string
    volumesByPaymentMethod: string
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
    direction: string
    qrScanAndConfirm: string
    openQrConfirmation: string
    recipientPhoneNumber: string
    recipientAccountNumber: string
    searchButton: string
    refreshPayments: string
    recipientSearchHelper: string
    bankName: string
    bankAccount: string
    beneficiary: string
    sandboxBank: string
    sandboxBankDetails: string
    sandboxBankInfo: string
    bankTransferReviewTitle: string
    bankTransferOtpNotice: string
    bankTransferOtpRequired: string
    cannotInitiatePayment: string
    cannotConfirmQr: string
    paymentAuthenticatorRequired: string
    paymentVerificationRequired: string
    paymentVerificationMethod: string
    notificationOtp: string
    googleAuthenticator: string
    notificationOtpHint: string
    sendNotificationOtp: string
    sending: string
    notificationOtpSent: string
    notificationOtpCode: string
    notificationOtpExpiresIn: string
    notificationOtpExpired: string
    cannotSendPaymentOtp: string
    qrConfirmation: string
    qrConfirmationDescription: string
    qrPaymentCodeDescription: string
    qrAuthenticatorRequired: string
    googleAuthenticatorCode: string
    setupGoogleAuthenticator: string
    qrWaitingForRecipient: string
    qrRecipientWillReceiveLink: string
    confirmQr: string
    qrPaymentConfirmed: string
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
    paymentCancelled: string
    cannotCancelPayment: string
    cancelPayment: string
    twoFactorExpiresIn: string
    twoFactorExpired: string
    twoFactorAuthRequired: string
    twoFactorAuthRequiredDesc: string
    twoFactorAuthHint: string
    otpPlaceholder: string
    verifyAndLogin: string
    errorGeneratingSecret: string
    twoFactorEnabled: string
    twoFactorDisabled: string
    twoFactorAuth: string
    twoFactorDescription: string
    generateSecret: string
    scanQrCode: string
    scanQrDescription: string
    enableTwoFactor: string
    disableTwoFactor: string
    otpCode: string
    twoFactorActive: string
    invalidOtp: string
    openAction: string
    avatarUploadError: string
    avatarUploading: string
    avatarUpdated: string
    avatarRemoved: string
    removeAvatar: string
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
      withdrawalRequests: 'Demandes de retrait',
      requestWithdrawal: 'Demander un retrait',
      withdrawalMethod: 'Moyen de retrait',
      withdrawalRecipient: 'Nom du bénéficiaire',
      withdrawalDestination: 'Numéro de téléphone ou coordonnées du compte',
      withdrawalBankName: 'Nom de la banque',
      withdrawalNote: 'Note facultative',
      withdrawalSubmitted: 'Demande de retrait enregistrée. Le montant est réservé sur votre solde.',
      withdrawalCancelled: 'Demande annulée et montant rendu au solde.',
      withdrawalCountry: 'Pays du profil',
      noWithdrawalRequests: 'Aucune demande de retrait',
      cancelWithdrawal: 'Annuler la demande',
      withdrawalPending: 'En attente',
      withdrawalApproved: 'Approuvée',
      withdrawalPaid: 'Payée manuellement',
      withdrawalRejected: 'Refusée / annulée',
      withdrawalCancelledStatus: 'Annulée',
      withdrawalQueue: 'Demandes de retrait à traiter',
      withdrawalQueueDescription: 'Examinez les coordonnées et mettez à jour le statut après traitement.',
      withdrawalUser: 'Utilisateur',
      withdrawalDestinationDetails: 'Coordonnées de destination',
      withdrawalReviewNote: 'Motif du refus ou note de traitement',
      markWithdrawalPaid: 'Marquer comme payée',
      manualPayoutNotice: 'L’approbation ne réalise pas le versement. Effectuez le paiement hors application avant de le marquer comme payé.',
      withdrawalUnavailable: 'Impossible de charger les demandes de retrait',
      withdrawalAmountInvalid: 'Saisissez un montant valide supérieur à zéro.',
      withdrawalAccount: 'Compte / téléphone',
      noAlerts: 'Aucune alerte',
      noNotifications: 'Aucune notification',
      viewAllNotifications: 'Voir toutes les notifications',
      markAsRead: 'Marquer comme lu',
      retry: 'Réessayer',
      cannotLoadNotifications: 'Impossible de charger les notifications.',
      cannotMarkNotificationRead: 'Impossible de marquer cette notification comme lue.',
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
      cardNumber: 'Numéro de carte',
      accountNumber: 'Numéro de compte',
      cardholder: 'Titulaire',
      expiry: 'Expiration',
      eur: 'Euro (€)',
      usd: 'Dollar américain ($)',
      xof: 'Franc CFA (FCFA)',
      mga: 'Ariary (Ar)',
      search: 'Rechercher',
      refresh: 'Actualiser',
      exportPDF: 'Export PDF',
      print: 'Imprimer',
      downloadReceipt: 'Télécharger le reçu',
      confirmPayment: 'Confirmer le paiement',
      twoFactorCode: 'Code OTP de confirmation (pas le CVV)',
      codeReceived: 'Code Google Authenticator',
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
      pendingApproval: 'En attente de validation',
      registrationRejected: 'Demande refusée',
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
      qrData: 'Données QR',
      metadata: 'Métadonnées',
      details: 'Détails',
      history: 'Historique',
      lastTransactions: 'Dernières transactions',
      sendPayment: 'Envoyer un paiement',
      recipientAccount: 'Compte destinataire',
      phoneNumber: 'Numéro de téléphone',
      amountLabel: 'Montant',
      paymentCurrency: 'Devise du paiement',
      walletDebitAmount: 'Débit estimé du portefeuille (devise du portefeuille)',
      sandboxExchangeRateNotice: 'Taux fictifs de démonstration : 1 € = 5 000 Ar, 1 $ = 4 600 Ar, 1 FCFA = 8 Ar. Aucun cours réel.',
      searchRecipient: 'Rechercher le destinataire',
      recipientInfo: 'Information destinataire',
      paymentMode: 'Mode de paiement',
      selectOperator: 'Sélectionner',
      cardExpiry: 'Date d’expiration (mois/année)',
      expiryMonth: 'Mois',
      expiryYear: 'Année',
      cvv: 'CVV',
      dynamicCvv: 'Votre CVV : {{code}}',
      dynamicCvvNotice: 'Code temporaire renouvelé toutes les 30 minutes.',
      invalidExpiry: 'Saisissez un mois et une année d’expiration valides dans le futur.',
      invalidCvv: 'CVV invalide. Consultez le code dans Mon Portefeuille.',
      payNow: 'Payer maintenant',
      paymentFeePreview: 'Récapitulatif avant paiement',
      calculatingFee: 'Calcul des frais...',
      cannotCalculateFee: 'Impossible de calculer les frais de transaction',
      loadingBalance: 'Chargement du solde actuel...',
      cannotLoadBalance: 'Impossible de charger le solde actuel',
      insufficientBalance: 'Votre solde actuel est insuffisant pour ce paiement.',
      performance: 'Performance IA',
      channels: 'Canaux',
      channelsDescription: 'Répartition des flux financiers consolidés',
      transactionRatesByChannel: 'Répartition des transactions par canal',
      allClientsTransactionScope: 'Pourcentage de toutes les transactions, tous statuts et tous clients confondus.',
      transactionShare: 'Part des transactions',
      aiMetrics: 'Métriques IA',
      metricsDescription: 'Données de performance du modèle',
      precision: 'Précision',
      recall: 'Rappel',
      f1Score: 'F1-score',
      analyzed: 'Analysées',
      transactionMetricScope: 'Vos paiements envoyés; l’admin voit l’agrégat de tous les utilisateurs.',
      adminPanel: 'Panneau d\'administration',
      adminDescription: 'Supervision des utilisateurs, transactions et alertes IA',
      activeUsers: 'Utilisateurs actifs',
      transactionsToReview: 'Transactions à vérifier',
      transactionsToReviewDescription: 'Toutes les transactions en attente ou en cours de traitement.',
      backToDashboard: 'Retour au tableau de bord',
      aiAlerts: 'Alertes IA ouvertes',
      collectedTransactionFees: 'Frais de transaction encaissés',
      viewDetails: 'Voir',
      hideDetails: 'Masquer',
      userManagement: 'Gestion des utilisateurs',
      viewDocument: 'Voir le document',
      close: 'Fermer',
      documentPreviewUnavailable: 'Aperçu indisponible pour ce format de fichier.',
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
      previousYear: 'Année précédente',
      nextYear: 'Année suivante',
      riskLevel: 'Niveau de risque',
      mainReason: 'Motif principal',
      senderName: 'Expéditeur',
      recipientName: 'Destinataire',
      transactionAmount: 'Montant',
      transactionFee: 'Frais (à la charge de l’expéditeur)',
      transactionTotal: 'Total débité à l’expéditeur',
      recipientReceivesAmount: 'Le destinataire recevra exactement le montant indiqué ; les frais sont débités en plus du portefeuille de l’expéditeur.',
      receiptFee: 'Frais',
      receiptTotal: 'Total débité',
      profileImageUploaded: 'Photo de profil mise à jour',
      securityRules: 'Règles de sécurité',
      securityRulesDescription: 'Modifiez les règles de contrôle et de tarification à tout moment.',
      saveRule: 'Enregistrer',
      deleteRule: 'Supprimer',
      ruleName: 'Nom de la règle',
      ruleType: 'Type',
      conditions: 'Conditions JSON',
      priority: 'Priorité',
      active: 'Active',
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
      includeAllTransactions: 'Inclure les transactions non signalées pour les évaluer',
      showFraudAlertsOnly: 'Afficher uniquement les alertes',
      cannotResolveFraudAlert: 'Impossible de marquer cette alerte comme traitée',
      markFraudReviewed: 'Marquer comme traitée',
      fraudReviewed: 'Alerte traitée',
      investigateFraudAlert: 'Enquêter sur cette alerte',
      investigationDetails: 'Détails de l’enquête',
      previousReviewNotes: 'Notes enregistrées précédemment',
      accountContext: 'Contexte du compte',
      recentTransactions: 'Transactions récentes de l’expéditeur',
      transactionOutcome: 'Résultat de la transaction',
      aiDecision: 'Décision antifraude',
      aiFactors: 'Facteurs détectés',
      aiEvidenceUnavailable: 'Les données détaillées du modèle ne sont pas disponibles pour cette ancienne transaction.',
      fraudOutcomeLabel: 'Verdict vérifié',
      selectFraudOutcome: 'Sélectionnez le résultat de la vérification',
      confirmedFraud: 'Fraude confirmée',
      legitimateTransaction: 'Transaction légitime',
      fraudOutcomeImpact: 'Ce verdict alimente les métriques du payeur et l’agrégat administrateur.',
      internalConclusion: 'Notes et conclusion de l’enquête',
      internalConclusionPlaceholder: 'Décrivez les faits vérifiés et votre conclusion (10 caractères minimum).',
      startInvestigation: 'Enregistrer et poursuivre l’enquête',
      resolveAfterInvestigation: 'Terminer la revue et enregistrer le verdict',
      legitimateUserCloseHint: 'Après vérification, choisissez un verdict et consignez les faits observés.',
      investigationProgressSaved: 'Les notes ont été enregistrées et l’enquête reste ouverte.',
      suspendUserConfirm: 'Confirmer la suspension du compte de {{name}} ?',
      suspendAccount: 'Suspendre le compte',
      suspensionReasonPlaceholder: 'Motif de suspension (10 caractères minimum).',
      confirmSuspendAccount: 'Confirmer la suspension',
      investigationLoadFailed: 'Impossible de charger les éléments de l’enquête',
      investigationSaveFailed: 'Impossible d’enregistrer la décision',
      accountSuspended: 'Le compte a été suspendu et l’alerte reste ouverte pour suivi.',
      statusOpen: 'À examiner',
      statusInvestigating: 'En cours d’enquête',
      statusResolved: 'Enquête clôturée',
      transactionFailure: 'Motif d’échec',
      transactionReference: 'N°',
      totalDebited: 'Total débité',
      noRecentTransactions: 'Aucune transaction récente.',
      kycStatusLabel: 'Statut KYC',
      kybStatusLabel: 'Statut KYB',
      backToList: 'Retour à la liste',
      accountStatusLabel: 'Compte : {{status}}',
      accountExpirationDate: 'Expiration du compte : {{date}}',
      reactivationUntilDate: 'Réactivation jusqu\'au {{date}}',
      noKycDocuments: 'Aucun document KYC',
      noKybDocuments: 'Aucun document KYB',
      rejectionReasonLabel: 'Motif: {{reason}}',
      blockReasonPrompt: 'Motif du blocage :',
      deleteAccountConfirm: 'Supprimer ce compte ? Une réactivation sera possible pendant 30 jours.',
      permanentDeleteConfirm: 'Supprimer définitivement ce compte ?',
      deleteAccount: 'Supprimer mon compte',
      accountDeletionDescription: 'Le compte sera bloqué immédiatement. La vérification de sécurité peut bloquer la demande en cas de fraude ou d’opérations en cours. Après 30 jours, les données personnelles seront anonymisées et l’historique financier conservé.',
      confirmSelfDeletion: 'Confirmer la demande ? Votre compte sera bloqué immédiatement et pourra être récupéré pendant 30 jours.',
      deletionStepOne: 'Étape 1 sur 2 : confirmer votre choix',
      deletionStepTwo: 'Étape 2 sur 2 : vérifier votre identité',
      continueDeletion: 'Continuer',
      accountDeletionBlocked: 'Demande bloquée par la vérification de sécurité :',
      accountDeletionScheduled: 'Suppression programmée. Vous pouvez récupérer votre compte en vous reconnectant avant le {{date}}.',
      accountDeletionPending: 'Ce compte est en cours de suppression. Récupérez-le avec votre email et votre mot de passe avant la fin du délai de 30 jours.',
      accountDeletionRecoveryHint: 'Une suppression est programmée. Vous pouvez encore récupérer votre compte pendant le délai de 30 jours.',
      restoreAccount: 'Annuler la suppression et récupérer mon compte',
      accountDeletionRestored: 'Suppression annulée. Reconnectez-vous pour accéder à votre compte.',
      accountDeletionExpired: 'Le délai de 30 jours est expiré. La suppression ne peut plus être annulée.',
      requestAccountDeletion: 'Demander la suppression',
      password: 'Mot de passe',
      errorLoading: 'Erreur lors du chargement',
      errorValidation: 'Erreur lors de la validation',
      errorAccountManagement: 'Erreur lors de la gestion du compte',
      accountCreatedSuccess: 'Votre demande de création de compte a été envoyée. Vous pourrez vous connecter après validation par un administrateur.',
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
      hideSensitiveData: 'Masquer les données sensibles',
      showSensitiveData: 'Afficher les données sensibles',
      copySensitiveData: 'Copier {{label}}',
      copied: 'Copié',
      copyFailed: 'Échec de la copie',
      searchPlaceholder: 'Rechercher...',
      unread: 'Non lu',
      paysmart: 'Paysmart',
      paysmartHome: 'Paysmart, accueil',
      transactionHistory: 'Historique des transactions',
      viewLastTransactions: 'Consultez vos dernières transactions',
      welcomeMessage: 'Bienvenue, {{name}} ! Voici les indicateurs de votre activité.',
      loadingAnalyticsData: 'Chargement des données Analytics...',
      realTimeConsolidatedData: 'Données consolidées en temps réel',
      volumesByPaymentMethod: 'Volumes par méthode de paiement',
      cannotLoadPayments: 'Impossible de charger les paiements',
      phoneDigitsOnly: 'Le numéro de téléphone doit contenir uniquement des chiffres',
      accountDigitsOnly: 'Le numéro de compte doit contenir uniquement des chiffres',
      recipientNotFound: 'Compte destinataire introuvable',
      paymentCreated: 'Paiement N° {{reference}} créé. Statut : {{status}}.',
      paymentConfirmedLedger: 'Paiement confirmé.',
      paymentFailed: 'Paiement échoué : {{reason}}',
      paymentConfirmed2fa: 'Paiement confirmé.',
      paymentStatus: 'Paiement {{status}}.',
      invalid2faCode: 'Code 2FA invalide ou expiré',
      receiptTitle: 'PAYSMART - RECU DE PAIEMENT',
      receiptReference: 'N° : {{ref}}',
      receiptAmount: 'Montant: {{amount}} {{currency}}',
      receiptChannel: 'Canal: {{channel}}',
      receiptStatus: 'Statut: {{status}}',
      receiptDate: 'Date: {{date}}',
      transactionStatus: 'Transaction {{ref}} : {{status}}',
    transactionDetails: 'Détails de la transaction',
    direction: 'Direction',
      recipientPhoneNumber: 'Numéro de téléphone destinataire',
      recipientAccountNumber: 'Numéro du compte PayeSmart destinataire',
      searchButton: 'Rechercher',
      refreshPayments: 'Actualiser les paiements',
      recipientSearchHelper: 'Le compte destinataire est recherché avec ce numéro. Les opérateurs sont proposés ci-dessus.',
      qrScanAndConfirm: 'Scannez ce QR code, vérifiez le bénéficiaire et le montant, puis confirmez.',
      openQrConfirmation: 'Ouvrir la confirmation dans PayeSmart',
      bankName: 'Banque destinataire',
      bankAccount: 'Compte destinataire',
      beneficiary: 'Bénéficiaire',
      sandboxBank: 'Banque de démonstration PayeSmart',
      sandboxBankDetails: 'Récapitulatif du virement',
      sandboxBankInfo: 'Ces coordonnées ne correspondent pas à une banque réelle. Le transfert reste une simulation.',
      bankTransferReviewTitle: 'Vérifiez le bénéficiaire, la banque et le montant avant de continuer.',
      bankTransferOtpNotice: 'Confirmez ce virement avec le code à 6 chiffres de Google Authenticator. Aucune authentification bancaire réelle n’est connectée.',
      bankTransferOtpRequired: 'Saisissez le code à 6 chiffres de Google Authenticator pour confirmer ce virement.',
      cannotInitiatePayment: 'Impossible d\'initier le paiement',
      cannotConfirmQr: 'Impossible de confirmer le QR',
      paymentAuthenticatorRequired: 'Confirmez ce paiement avec le code à 6 chiffres de Google Authenticator. Activez la 2FA dans vos paramètres si nécessaire.',
      paymentVerificationRequired: 'Choisissez comment confirmer ce paiement.',
      paymentVerificationMethod: 'Méthode de confirmation',
      notificationOtp: 'Code OTP par notification',
      googleAuthenticator: 'Google Authenticator',
      notificationOtpHint: 'Le code apparaît immédiatement dans vos notifications PayeSmart et expire après 2 minutes.',
      sendNotificationOtp: 'Envoyer le code maintenant',
      sending: 'Envoi...',
      notificationOtpSent: 'Code envoyé dans vos notifications PayeSmart. Il est valable 2 minutes.',
      notificationOtpCode: 'Code OTP reçu par notification',
      notificationOtpExpiresIn: 'Le code expire dans {{seconds}} s.',
      notificationOtpExpired: 'Code expiré. Demandez un nouveau code dans vos notifications.',
      cannotSendPaymentOtp: 'Impossible d’envoyer le code de confirmation',
      qrConfirmation: 'Confirmation du paiement QR',
      qrConfirmationDescription: 'Vérifiez les informations du paiement avant de confirmer.',
      qrPaymentCodeDescription: 'Voici le QR code de cette demande de paiement. Vérifiez le bénéficiaire et le montant avant de confirmer.',
      qrAuthenticatorRequired: 'Saisissez le code à 6 chiffres affiché dans Google Authenticator. La 2FA doit être activée dans vos paramètres de sécurité.',
      googleAuthenticatorCode: 'Code Google Authenticator',
      setupGoogleAuthenticator: 'Configurer Google Authenticator',
      qrWaitingForRecipient: 'En attente de la confirmation du destinataire.',
      qrRecipientWillReceiveLink: 'Le destinataire recevra le lien et le QR code de confirmation par notification.',
      confirmQr: 'Confirmer le paiement QR',
      qrPaymentConfirmed: 'Paiement QR confirmé.',
      onlyRecipientCanConfirm: 'Connectez-vous avec le compte du destinataire pour confirmer ce paiement.',
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
      twoFactorExpired: 'Code expiré. Annulez ce paiement et recommencez pour recevoir un nouveau code.',
      twoFactorAuthRequired: 'Vérification en deux étapes requise',
      twoFactorAuthRequiredDesc: 'Un code de vérification a été envoyé à votre application d\'authentification',
      twoFactorAuthHint: 'Code de connexion pour {{email}}',
      otpPlaceholder: 'Code à 6 chiffres',
      verifyAndLogin: 'Vérifier et se connecter',
      errorGeneratingSecret: 'Erreur lors de la génération du secret 2FA',
      twoFactorEnabled: '2FA activé avec succès',
      twoFactorDisabled: '2FA désactivé avec succès',
      twoFactorAuth: 'Authentification en deux étapes',
      twoFactorDescription: 'Activez la vérification en deux étapes pour sécuriser votre compte',
      generateSecret: 'Générer le secret',
      scanQrCode: 'Scannez le code QR',
      scanQrDescription: 'Scannez ce code QR avec votre application d\'authentification (Google Authenticator, Authy, etc.)',
      enableTwoFactor: 'Activer la 2FA',
      disableTwoFactor: 'Désactiver la 2FA',
      otpCode: 'Code OTP',
      twoFactorActive: 'La vérification en deux étapes est activée',
      invalidOtp: 'Code OTP invalide',
      paymentCancelled: 'Paiement annulé',
      cannotCancelPayment: 'Impossible d’annuler le paiement',
      cancelPayment: 'Annuler le paiement',
      avatarUploadError: 'Erreur lors du téléchargement de la photo',
      avatarUploading: 'Téléchargement de la photo...',
      avatarUpdated: 'Photo de profil mise à jour',
      avatarRemoved: 'Photo de profil supprimée',
      removeAvatar: 'Supprimer la photo',
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
      withdrawalRequests: 'Withdrawal requests',
      requestWithdrawal: 'Request withdrawal',
      withdrawalMethod: 'Withdrawal method',
      withdrawalRecipient: 'Recipient name',
      withdrawalDestination: 'Phone number or account details',
      withdrawalBankName: 'Bank name',
      withdrawalNote: 'Optional note',
      withdrawalSubmitted: 'Withdrawal request recorded. The amount is reserved from your balance.',
      withdrawalCancelled: 'Request cancelled and amount returned to your balance.',
      withdrawalCountry: 'Profile country',
      noWithdrawalRequests: 'No withdrawal requests',
      cancelWithdrawal: 'Cancel request',
      withdrawalPending: 'Pending',
      withdrawalApproved: 'Approved',
      withdrawalPaid: 'Paid manually',
      withdrawalRejected: 'Rejected / cancelled',
      withdrawalCancelledStatus: 'Cancelled',
      withdrawalQueue: 'Withdrawal requests to process',
      withdrawalQueueDescription: 'Review destination details and update the status after processing.',
      withdrawalUser: 'User',
      withdrawalDestinationDetails: 'Destination details',
      withdrawalReviewNote: 'Rejection reason or processing note',
      markWithdrawalPaid: 'Mark as paid',
      manualPayoutNotice: 'Approval does not transfer funds. Complete the payment outside the app before marking it paid.',
      withdrawalUnavailable: 'Unable to load withdrawal requests',
      withdrawalAmountInvalid: 'Enter a valid amount greater than zero.',
      withdrawalAccount: 'Account / phone',
      noAlerts: 'No alerts',
      noNotifications: 'No notifications',
      viewAllNotifications: 'View all notifications',
      markAsRead: 'Mark as read',
      retry: 'Retry',
      cannotLoadNotifications: 'Unable to load notifications.',
      cannotMarkNotificationRead: 'Unable to mark this notification as read.',
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
      cardNumber: 'Card number',
      accountNumber: 'Account number',
      cardholder: 'Cardholder',
      expiry: 'Expiry',
      eur: 'Euro (€)',
      usd: 'US dollar ($)',
      xof: 'CFA franc (FCFA)',
      mga: 'Malagasy ariary (Ar)',
      search: 'Search',
      refresh: 'Refresh',
      exportPDF: 'Export PDF',
      print: 'Print',
      downloadReceipt: 'Download receipt',
      confirmPayment: 'Confirm payment',
      twoFactorCode: 'Payment confirmation OTP (not the CVV)',
      codeReceived: 'Google Authenticator code',
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
      pendingApproval: 'Pending approval',
      registrationRejected: 'Request rejected',
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
      qrData: 'QR data',
      metadata: 'Metadata',
      details: 'Details',
      history: 'History',
      lastTransactions: 'Last transactions',
      sendPayment: 'Send payment',
      recipientAccount: 'Recipient account',
      phoneNumber: 'Phone number',
      amountLabel: 'Amount',
      paymentCurrency: 'Payment currency',
      walletDebitAmount: 'Estimated wallet debit (wallet currency)',
      sandboxExchangeRateNotice: 'Fictional demo rates: 1 € = 5,000 Ar, 1 $ = 4,600 Ar, 1 FCFA = 8 Ar. These are not live rates.',
      searchRecipient: 'Search recipient',
      recipientInfo: 'Recipient information',
      paymentMode: 'Payment mode',
      selectOperator: 'Select',
      cardExpiry: 'Expiry date (month/year)',
      expiryMonth: 'Month',
      expiryYear: 'Year',
      cvv: 'CVV',
      dynamicCvv: 'Your CVV: {{code}}',
      dynamicCvvNotice: 'Temporary code renewed every 30 minutes.',
      invalidExpiry: 'Enter a valid future expiry month and year.',
      invalidCvv: 'Invalid CVV. Check the code in My Wallet.',
      payNow: 'Pay now',
      paymentFeePreview: 'Payment summary',
      calculatingFee: 'Calculating fees...',
      cannotCalculateFee: 'Unable to calculate transaction fees',
      loadingBalance: 'Loading current balance...',
      cannotLoadBalance: 'Unable to load current balance',
      insufficientBalance: 'Your current balance is insufficient for this payment.',
      performance: 'AI performance',
      channels: 'Channels',
      channelsDescription: 'Consolidated financial flows breakdown',
      transactionRatesByChannel: 'Transaction share by channel',
      allClientsTransactionScope: 'Share of all transactions, all statuses and all clients.',
      transactionShare: 'Transaction share',
      aiMetrics: 'AI Metrics',
      metricsDescription: 'Model performance data',
      precision: 'Precision',
      recall: 'Recall',
      f1Score: 'F1-score',
      analyzed: 'Analyzed',
      transactionMetricScope: 'Your sent payments; admins see the aggregate for all users.',
      adminPanel: 'Admin panel',
      adminDescription: 'Supervision of users, transactions and AI alerts',
      activeUsers: 'Active users',
      transactionsToReview: 'Transactions to review',
      transactionsToReviewDescription: 'All transactions pending or currently processing.',
      backToDashboard: 'Back to dashboard',
      aiAlerts: 'Open AI alerts',
      collectedTransactionFees: 'Collected transaction fees',
      viewDetails: 'View',
      hideDetails: 'Hide',
      userManagement: 'User management',
      viewDocument: 'View document',
      close: 'Close',
      documentPreviewUnavailable: 'Preview is unavailable for this file type.',
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
      previousYear: 'Previous year',
      nextYear: 'Next year',
      riskLevel: 'Risk level',
      mainReason: 'Main reason',
      senderName: 'Sender',
      recipientName: 'Recipient',
      transactionAmount: 'Amount',
      transactionFee: 'Fee (paid by sender)',
      transactionTotal: 'Total debited from sender',
      recipientReceivesAmount: 'The recipient receives exactly the amount entered; the fee is charged in addition to the sender’s wallet.',
      receiptFee: 'Fee',
      receiptTotal: 'Total debited',
      profileImageUploaded: 'Profile photo updated',
      securityRules: 'Security rules',
      securityRulesDescription: 'Edit control and pricing rules at any time.',
      saveRule: 'Save',
      deleteRule: 'Delete',
      ruleName: 'Rule name',
      ruleType: 'Type',
      conditions: 'Conditions JSON',
      priority: 'Priority',
      active: 'Active',
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
      includeAllTransactions: 'Include unflagged transactions for evaluation',
      showFraudAlertsOnly: 'Show flagged alerts only',
      cannotResolveFraudAlert: 'Unable to mark this alert as reviewed',
      markFraudReviewed: 'Mark as reviewed',
      fraudReviewed: 'Alert reviewed',
      investigateFraudAlert: 'Investigate this alert',
      investigationDetails: 'Investigation details',
      previousReviewNotes: 'Previously saved notes',
      accountContext: 'Account context',
      recentTransactions: 'Sender’s recent transactions',
      transactionOutcome: 'Transaction outcome',
      aiDecision: 'Fraud decision',
      aiFactors: 'Detected factors',
      aiEvidenceUnavailable: 'Detailed model data is unavailable for this older transaction.',
      fraudOutcomeLabel: 'Verified verdict',
      selectFraudOutcome: 'Select the review outcome',
      confirmedFraud: 'Confirmed fraud',
      legitimateTransaction: 'Legitimate transaction',
      fraudOutcomeImpact: 'This verdict contributes to the payer metrics and the admin aggregate.',
      internalConclusion: 'Investigation notes and conclusion',
      internalConclusionPlaceholder: 'Describe the verified facts and your conclusion (at least 10 characters).',
      startInvestigation: 'Save and continue investigation',
      resolveAfterInvestigation: 'Finish review and save verdict',
      legitimateUserCloseHint: 'After verification, select a verdict and record the evidence observed.',
      investigationProgressSaved: 'The notes were saved and the investigation remains open.',
      suspendUserConfirm: 'Confirm suspending {{name}}’s account?',
      suspendAccount: 'Suspend account',
      suspensionReasonPlaceholder: 'Reason for suspension (at least 10 characters).',
      confirmSuspendAccount: 'Confirm suspension',
      investigationLoadFailed: 'Unable to load investigation evidence',
      investigationSaveFailed: 'Unable to save the decision',
      accountSuspended: 'The account has been suspended and the alert remains open for follow-up.',
      statusOpen: 'Needs review',
      statusInvestigating: 'Under investigation',
      statusResolved: 'Investigation closed',
      transactionFailure: 'Failure reason',
      transactionReference: 'No.',
      totalDebited: 'Total debited',
      noRecentTransactions: 'No recent transactions.',
      kycStatusLabel: 'KYC status',
      kybStatusLabel: 'KYB status',
      backToList: 'Back to list',
      accountStatusLabel: 'Account: {{status}}',
      accountExpirationDate: 'Account expires on {{date}}',
      reactivationUntilDate: 'Reactivation until {{date}}',
      noKycDocuments: 'No KYC documents',
      noKybDocuments: 'No KYB documents',
      rejectionReasonLabel: 'Reason: {{reason}}',
      blockReasonPrompt: 'Reason for blocking:',
      deleteAccountConfirm: 'Delete this account? Reactivation will be possible for 30 days.',
      permanentDeleteConfirm: 'Permanently delete this account?',
      deleteAccount: 'Delete my account',
      accountDeletionDescription: 'The account will be locked immediately. Security checks can block the request if fraud or pending operations are detected. After 30 days, personal data will be anonymized and financial history retained.',
      confirmSelfDeletion: 'Confirm this request? Your account will be locked immediately and can be restored for 30 days.',
      deletionStepOne: 'Step 1 of 2: confirm your choice',
      deletionStepTwo: 'Step 2 of 2: verify your identity',
      continueDeletion: 'Continue',
      accountDeletionBlocked: 'Request blocked by the security review:',
      accountDeletionScheduled: 'Deletion scheduled. Sign in to restore your account before {{date}}.',
      accountDeletionPending: 'This account is pending deletion. Restore it with your email and password before the 30-day deadline.',
      accountDeletionRecoveryHint: 'Deletion is scheduled. You can still restore your account during the 30-day grace period.',
      restoreAccount: 'Cancel deletion and restore my account',
      accountDeletionRestored: 'Deletion cancelled. Sign in again to access your account.',
      accountDeletionExpired: 'The 30-day period has expired. Deletion can no longer be cancelled.',
      requestAccountDeletion: 'Request account deletion',
      password: 'Password',
      errorLoading: 'Error loading',
      errorValidation: 'Error during validation',
      errorAccountManagement: 'Error managing account',
      accountCreatedSuccess: 'Your account request was submitted. You can log in after an administrator approves it.',
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
      hideSensitiveData: 'Hide sensitive data',
      showSensitiveData: 'Show sensitive data',
      copySensitiveData: 'Copy {{label}}',
      copied: 'Copied',
      copyFailed: 'Copy failed',
      searchPlaceholder: 'Search...',
      unread: 'Unread',
      paysmart: 'Paysmart',
      paysmartHome: 'Paysmart, home',
      transactionHistory: 'Transaction history',
      viewLastTransactions: 'View your latest transactions',
      welcomeMessage: 'Welcome back, {{name}}! Here are your activity metrics.',
      loadingAnalyticsData: 'Loading Analytics data...',
      realTimeConsolidatedData: 'Real-time consolidated data',
      volumesByPaymentMethod: 'Volumes by payment method',
      cannotLoadPayments: 'Unable to load payments',
      phoneDigitsOnly: 'Phone number must contain only digits',
      accountDigitsOnly: 'Account number must contain only digits',
      recipientNotFound: 'Recipient account not found',
      paymentCreated: 'Payment No. {{reference}} created. Status: {{status}}.',
      paymentConfirmedLedger: 'Payment confirmed.',
      paymentFailed: 'Payment failed: {{reason}}',
      paymentConfirmed2fa: 'Payment confirmed.',
      paymentStatus: 'Payment {{status}}.',
      invalid2faCode: 'Invalid or expired 2FA code',
      receiptTitle: 'PAYSMART - PAYMENT RECEIPT',
      receiptReference: 'No.: {{ref}}',
      receiptAmount: 'Amount: {{amount}} {{currency}}',
      receiptChannel: 'Channel: {{channel}}',
      receiptStatus: 'Status: {{status}}',
      receiptDate: 'Date: {{date}}',
      transactionStatus: 'Transaction {{ref}}: {{status}}',
    transactionDetails: 'Transaction Details',
    direction: 'Direction',
      recipientPhoneNumber: 'Recipient phone number',
      recipientAccountNumber: 'Recipient PayeSmart account number',
      searchButton: 'Search',
      refreshPayments: 'Refresh payments',
      recipientSearchHelper: 'The recipient account is searched with this number. Operators are proposed above.',
      qrScanAndConfirm: 'Scan this QR code, verify the beneficiary and amount, then confirm.',
      openQrConfirmation: 'Open the confirmation in PayeSmart',
      bankName: 'Recipient bank',
      bankAccount: 'Recipient account',
      beneficiary: 'Beneficiary',
      sandboxBank: 'PayeSmart demo bank',
      sandboxBankDetails: 'Transfer summary',
      sandboxBankInfo: 'These details do not belong to a real bank. The transfer remains a simulation.',
      bankTransferReviewTitle: 'Review the beneficiary, bank, and amount before continuing.',
      bankTransferOtpNotice: 'Confirm this transfer with the 6-digit code from Google Authenticator. No real bank authentication is connected.',
      bankTransferOtpRequired: 'Enter the 6-digit Google Authenticator code to confirm this transfer.',
      cannotInitiatePayment: 'Unable to initiate payment',
      cannotConfirmQr: 'Unable to confirm QR',
      paymentAuthenticatorRequired: 'Confirm this payment with the 6-digit Google Authenticator code. Enable 2FA in your settings if needed.',
      paymentVerificationRequired: 'Choose how to confirm this payment.',
      paymentVerificationMethod: 'Confirmation method',
      notificationOtp: 'OTP code by notification',
      googleAuthenticator: 'Google Authenticator',
      notificationOtpHint: 'The code appears immediately in your PayeSmart notifications and expires after 2 minutes.',
      sendNotificationOtp: 'Send code now',
      sending: 'Sending...',
      notificationOtpSent: 'Code sent to your PayeSmart notifications. It is valid for 2 minutes.',
      notificationOtpCode: 'OTP code received by notification',
      notificationOtpExpiresIn: 'Code expires in {{seconds}}s.',
      notificationOtpExpired: 'Code expired. Request a new code in your notifications.',
      cannotSendPaymentOtp: 'Unable to send the confirmation code',
      qrConfirmation: 'QR payment confirmation',
      qrConfirmationDescription: 'Review the payment details before confirming.',
      qrPaymentCodeDescription: 'This is the QR code for this payment request. Verify the recipient and amount before confirming.',
      qrAuthenticatorRequired: 'Enter the 6-digit code shown in Google Authenticator. 2FA must be enabled in your security settings.',
      googleAuthenticatorCode: 'Google Authenticator code',
      setupGoogleAuthenticator: 'Set up Google Authenticator',
      qrWaitingForRecipient: 'Waiting for the recipient to confirm.',
      qrRecipientWillReceiveLink: 'The recipient will receive the confirmation link and QR code in a notification.',
      confirmQr: 'Confirm QR Payment',
      qrPaymentConfirmed: 'QR payment confirmed.',
      onlyRecipientCanConfirm: 'Sign in with the recipient account to confirm this payment.',
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
      twoFactorExpired: 'Code expired. Cancel this payment and start again to receive a new code.',
      twoFactorAuthRequired: 'Two-factor authentication required',
      twoFactorAuthRequiredDesc: 'A verification code has been sent to your authenticator app',
      twoFactorAuthHint: 'Login code for {{email}}',
      otpPlaceholder: '6-digit code',
      verifyAndLogin: 'Verify and login',
      errorGeneratingSecret: 'Error generating 2FA secret',
      twoFactorEnabled: '2FA enabled successfully',
      twoFactorDisabled: '2FA disabled successfully',
      twoFactorAuth: 'Two-factor authentication',
      twoFactorDescription: 'Enable two-factor verification to secure your account',
      generateSecret: 'Generate secret',
      scanQrCode: 'Scan the QR code',
      scanQrDescription: 'Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)',
      enableTwoFactor: 'Enable 2FA',
      disableTwoFactor: 'Disable 2FA',
      otpCode: 'OTP code',
      twoFactorActive: 'Two-factor authentication is enabled',
      invalidOtp: 'Invalid OTP code',
      paymentCancelled: 'Payment cancelled',
      cannotCancelPayment: 'Unable to cancel payment',
      cancelPayment: 'Cancel payment',
      avatarUploadError: 'Error uploading profile photo',
      avatarUploading: 'Uploading photo...',
      avatarUpdated: 'Profile photo updated',
      avatarRemoved: 'Profile photo removed',
      removeAvatar: 'Remove photo',
    },
  },
}

export function useTranslation() {
  const { settings } = useSettings()
  const lang = settings.language
  const locale = lang === 'en' ? 'en-US' : 'fr-FR'

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
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
  }, [lang])

  const tc = useCallback((key: string, params?: Record<string, string | number>): string => {
    const direct = t(key, params)
    if (direct !== key) return direct
    const nested = t(`common.${key}`, params)
    return nested !== `common.${key}` ? nested : key
  }, [t])

  const formatMoney = useCallback((amount: number, sourceCurrency?: string, targetCurrency = settings.currency) => {
    const convertedAmount = convertCurrency(amount, sourceCurrency, targetCurrency)
    return formatCurrencySymbol(convertedAmount, targetCurrency, locale)
  }, [locale, settings.currency])

  return { t: tc, lang, locale, formatMoney }
}
