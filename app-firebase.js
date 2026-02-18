const { useState, useEffect } = React;
const { jsPDF } = window.jspdf;

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authMode, setAuthMode] = useState('login'); // 'login' ou 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    
    const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState(1);
    const [invoices, setInvoices] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [companyInfo, setCompanyInfo] = useState({
        name: "Ste Walk",
        address: "Walk route Gabes km 7 cité el moez1 Sfax SUD, Sfax 3083",
        phone: "21 413 434",
        codeTVA: "1943182Z/A/M/000",
        rc: "",
        codeDouane: ""
    });

    const [formData, setFormData] = useState({
        clientName: "",
        clientAddress: "",
        clientPhone: "",
        clientCodeTVA: "",
        clientCode: "",
        chauffeur: "",
        vehicule: "",
        vref: "",
        date: new Date().toISOString().split('T')[0],
        items: [{ code: "", designation: "", qty: 1, unitPrice: 0, discount: 0 }],
        tvaRate: 19
    });

    // Écouter l'état de connexion
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            if (user) {
                loadUserData(user.uid);
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Charger les données de l'utilisateur
    const loadUserData = async (userId) => {
        try {
            // Charger les factures
            const invoicesSnapshot = await db.collection('users')
                .doc(userId)
                .collection('invoices')
                .orderBy('createdAt', 'desc')
                .get();

            const loadedInvoices = [];
            invoicesSnapshot.forEach(doc => {
                loadedInvoices.push({ id: doc.id, ...doc.data() });
            });
            setInvoices(loadedInvoices);

            // Charger le numéro de facture actuel
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data().currentInvoiceNumber) {
                setCurrentInvoiceNumber(userDoc.data().currentInvoiceNumber);
            } else {
                // Calculer le prochain numéro basé sur les factures existantes
                if (loadedInvoices.length > 0) {
                    const maxNumber = Math.max(...loadedInvoices.map(inv => inv.number));
                    setCurrentInvoiceNumber(maxNumber + 1);
                }
            }

            // Charger les infos entreprise
            if (userDoc.exists && userDoc.data().companyInfo) {
                setCompanyInfo(userDoc.data().companyInfo);
            }

            console.log(`${loadedInvoices.length} factures chargées`);
        } catch (error) {
            console.error('Erreur de chargement:', error);
        }
        setLoading(false);
    };

    // Inscription
    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            await auth.createUserWithEmailAndPassword(email, password);
            // L'utilisateur sera connecté automatiquement
        } catch (error) {
            setAuthError(getErrorMessage(error.code));
        }
    };

    // Connexion
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            setAuthError(getErrorMessage(error.code));
        }
    };

    // Déconnexion
    const handleLogout = async () => {
        try {
            await auth.signOut();
            setInvoices([]);
            setCurrentInvoiceNumber(1);
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
        }
    };

    // Messages d'erreur en français
    const getErrorMessage = (code) => {
        const messages = {
            'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
            'auth/invalid-email': 'Adresse email invalide',
            'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
            'auth/user-not-found': 'Aucun compte avec cette adresse email',
            'auth/wrong-password': 'Mot de passe incorrect',
            'auth/too-many-requests': 'Trop de tentatives, réessayez plus tard'
        };
        return messages[code] || 'Une erreur est survenue';
    };

    const calculateItemTotal = (item) => {
        const basePrice = item.qty * item.unitPrice;
        const afterDiscount = basePrice * (1 - item.discount / 100);
        return afterDiscount;
    };

    const calculateTotals = () => {
        const totalHT = formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
        const totalTVA = totalHT * (formData.tvaRate / 100);
        const timbre = 1.0;
        const totalTTC = totalHT + totalTVA + timbre;
        return { totalHT, totalTVA, timbre, totalTTC };
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { code: "", designation: "", qty: 1, unitPrice: 0, discount: 0 }]
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const generatePDF = (invoice) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(companyInfo.name, 20, 20);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(companyInfo.address, 20, 27);
        doc.text(`Tel : ${companyInfo.phone}`, 20, 32);
        if (companyInfo.codeTVA) doc.text(`Code TVA : ${companyInfo.codeTVA}`, 20, 37);
        if (companyInfo.rc) doc.text(`R.C : ${companyInfo.rc}`, 20, 42);
        if (companyInfo.codeDouane) doc.text(`Code en douane : ${companyInfo.codeDouane}`, 20, 47);

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`FACTURE N° : FC${invoice.number}`, pageWidth - 60, 20);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Date : ${invoice.date}`, pageWidth - 60, 27);
        doc.text(`Page N° : 1`, pageWidth - 60, 32);

        let y = 60;
        doc.setFont(undefined, 'bold');
        doc.text('Client:', 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(invoice.clientName, 40, y);
        y += 5;
        if (invoice.clientAddress) {
            doc.text(`Adresse : ${invoice.clientAddress}`, 20, y);
            y += 5;
        }
        if (invoice.clientPhone) {
            doc.text(`Tel : ${invoice.clientPhone}`, 20, y);
            y += 5;
        }
        if (invoice.clientCodeTVA) {
            doc.text(`Code TVA : ${invoice.clientCodeTVA}`, 20, y);
            y += 5;
        }
        if (invoice.clientCode) {
            doc.text(`Code Client : ${invoice.clientCode}`, 20, y);
            y += 5;
        }

        y += 5;
        if (invoice.chauffeur) {
            doc.text(`Chauffeur : ${invoice.chauffeur}`, 20, y);
            y += 5;
        }
        if (invoice.vehicule) {
            doc.text(`Vehicule N° : ${invoice.vehicule}`, 20, y);
            y += 5;
        }
        if (invoice.vref) {
            doc.text(`V/REF : ${invoice.vref}`, 20, y);
            y += 5;
        }

        y += 10;
        
        doc.setFillColor(230, 230, 230);
        doc.rect(15, y, pageWidth - 30, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text('Code', 17, y + 5);
        doc.text('Designation', 35, y + 5);
        doc.text('Qte', 90, y + 5);
        doc.text('P.U.H.T.', 105, y + 5);
        doc.text('Rem.%', 125, y + 5);
        doc.text('Montant HT', 145, y + 5);
        doc.text('TVA%', 175, y + 5);
        
        y += 8;
        doc.setFont(undefined, 'normal');

        invoice.items.forEach((item) => {
            const montantHT = item.qty * item.unitPrice * (1 - item.discount / 100);
            doc.text(item.code || '-', 17, y + 5);
            doc.text(item.designation.substring(0, 30), 35, y + 5);
            doc.text(item.qty.toString(), 90, y + 5);
            doc.text(item.unitPrice.toFixed(3), 105, y + 5);
            doc.text(item.discount.toFixed(1), 125, y + 5);
            doc.text(montantHT.toFixed(3), 145, y + 5);
            doc.text(invoice.tvaRate.toString(), 175, y + 5);
            y += 6;
        });

        y += 10;
        doc.setFont(undefined, 'bold');
        doc.text('Total HT:', 130, y);
        doc.text(invoice.totalHT.toFixed(3), 165, y);
        y += 6;
        doc.text(`TVA (${invoice.tvaRate}%):`, 130, y);
        doc.text(invoice.totalTVA.toFixed(3), 165, y);
        y += 6;
        doc.text('Timbre:', 130, y);
        doc.text(invoice.timbre.toFixed(3), 165, y);
        y += 6;
        doc.setFontSize(12);
        doc.text('Total TTC:', 130, y);
        doc.text(invoice.totalTTC.toFixed(3) + ' TND', 165, y);

        y += 15;
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        const totalWords = numberToWords(invoice.totalTTC);
        doc.text(`Arrete la presente facture a la somme de ${totalWords} dinars`, 20, y, { maxWidth: pageWidth - 40 });

        y += 15;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text("Droit de timbrer (Article 117 loi 93/53 Du 17/05/93)", 20, y);
        y += 5;
        doc.text("Dans le cas ou le paiement integral n'interviendrait pas a la date prevue par les parties,", 20, y);
        y += 4;
        doc.text("le vendeur se reserve le droit de reprendre la chose livree et de resoudre le contrat.", 20, y);
        y += 4;
        doc.text("Tout retard de paiement engendre une penalite calculee sur la base du taux d'interet legale en vigueur.", 20, y);

        const signY = doc.internal.pageSize.height - 30;
        doc.text('Signature et cachet du client', 30, signY);
        doc.text('Signature de responsable', pageWidth - 80, signY);

        return doc;
    };

    const numberToWords = (num) => {
        const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
        const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
        const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
        
        const convertUnder100 = (n) => {
            if (n < 10) return units[n];
            if (n < 20) return teens[n - 10];
            const ten = Math.floor(n / 10);
            const unit = n % 10;
            if (unit === 0) return tens[ten];
            if (unit === 1 && ten === 8) return 'quatre-vingt-un';
            if (unit === 1 && ten !== 7 && ten !== 9) return tens[ten] + ' et un';
            if (ten === 7) return 'soixante-' + teens[unit];
            if (ten === 9) return 'quatre-vingt-' + teens[unit];
            return tens[ten] + '-' + units[unit];
        };
        
        const convertUnder1000 = (n) => {
            if (n < 100) return convertUnder100(n);
            const hundreds = Math.floor(n / 100);
            const rest = n % 100;
            let result = hundreds === 1 ? 'cent' : units[hundreds] + ' cent';
            if (hundreds > 1 && rest === 0) result += 's';
            if (rest > 0) result += ' ' + convertUnder100(rest);
            return result;
        };
        
        const integer = Math.floor(num);
        const decimals = Math.round((num - integer) * 1000);
        
        if (integer === 0) return 'zero';
        
        let result = '';
        
        if (integer >= 1000000) {
            const millions = Math.floor(integer / 1000000);
            result += (millions === 1 ? 'un million' : convertUnder1000(millions) + ' millions') + ' ';
            integer %= 1000000;
        }
        
        if (integer >= 1000) {
            const thousands = Math.floor(integer / 1000);
            if (thousands === 1) {
                result += 'mille ';
            } else {
                result += convertUnder1000(thousands) + ' mille ';
            }
            integer %= 1000;
        }
        
        if (integer > 0) {
            result += convertUnder1000(integer);
        }
        
        result = result.trim();
        
        // Ajouter les millimes si différents de zéro
        if (decimals > 0) {
            result += ' dinars et ' + decimals + ' millimes';
        } else {
            result += ' dinars';
        }
        
        return result;
    };

    // Sauvegarder une nouvelle facture
    const saveInvoice = async () => {
        if (!user) return;

        const totals = calculateTotals();
        const invoiceData = {
            number: editingInvoice ? editingInvoice.number : currentInvoiceNumber,
            date: formData.date,
            clientName: formData.clientName,
            clientAddress: formData.clientAddress,
            clientPhone: formData.clientPhone,
            clientCodeTVA: formData.clientCodeTVA,
            clientCode: formData.clientCode,
            chauffeur: formData.chauffeur,
            vehicule: formData.vehicule,
            vref: formData.vref,
            items: formData.items,
            tvaRate: formData.tvaRate,
            ...totals,
            createdAt: editingInvoice ? editingInvoice.createdAt : firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.Timestamp.now()
        };

        try {
            if (editingInvoice) {
                // Modifier une facture existante
                await db.collection('users')
                    .doc(user.uid)
                    .collection('invoices')
                    .doc(editingInvoice.id)
                    .update(invoiceData);
                
                const updatedInvoices = invoices.map(inv => 
                    inv.id === editingInvoice.id ? { ...invoiceData, id: editingInvoice.id } : inv
                );
                setInvoices(updatedInvoices);
                alert('Facture modifiée avec succès !');
            } else {
                // Créer une nouvelle facture
                const docRef = await db.collection('users')
                    .doc(user.uid)
                    .collection('invoices')
                    .add(invoiceData);

                setInvoices([{ id: docRef.id, ...invoiceData }, ...invoices]);

                // Mettre à jour le numéro de facture
                const newNumber = currentInvoiceNumber + 1;
                await db.collection('users').doc(user.uid).set({
                    currentInvoiceNumber: newNumber,
                    companyInfo: companyInfo
                }, { merge: true });
                setCurrentInvoiceNumber(newNumber);
                
                alert('Facture enregistrée avec succès !');
            }

            // Générer le PDF
            const doc = generatePDF(invoiceData);
            doc.save(`Facture_FC${invoiceData.number}_${invoiceData.clientName.replace(/\s/g, '_')}.pdf`);

            // Réinitialiser le formulaire
            resetForm();
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la sauvegarde');
        }
    };

    // Modifier une facture
    const editInvoice = (invoice) => {
        setEditingInvoice(invoice);
        setFormData({
            clientName: invoice.clientName,
            clientAddress: invoice.clientAddress || "",
            clientPhone: invoice.clientPhone || "",
            clientCodeTVA: invoice.clientCodeTVA || "",
            clientCode: invoice.clientCode || "",
            chauffeur: invoice.chauffeur || "",
            vehicule: invoice.vehicule || "",
            vref: invoice.vref || "",
            date: invoice.date,
            items: invoice.items,
            tvaRate: invoice.tvaRate
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Supprimer une facture
    const deleteInvoice = async (invoice) => {
        if (!confirm(`Voulez-vous vraiment supprimer la facture FC${invoice.number} ?`)) {
            return;
        }

        try {
            await db.collection('users')
                .doc(user.uid)
                .collection('invoices')
                .doc(invoice.id)
                .delete();

            setInvoices(invoices.filter(inv => inv.id !== invoice.id));
            alert('Facture supprimée avec succès !');
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression');
        }
    };

    const downloadInvoicePDF = (invoice) => {
        const doc = generatePDF(invoice);
        doc.save(`Facture_FC${invoice.number}_${invoice.clientName.replace(/\s/g, '_')}.pdf`);
    };

    const resetForm = () => {
        setFormData({
            clientName: "",
            clientAddress: "",
            clientPhone: "",
            clientCodeTVA: "",
            clientCode: "",
            chauffeur: "",
            vehicule: "",
            vref: "",
            date: new Date().toISOString().split('T')[0],
            items: [{ code: "", designation: "", qty: 1, unitPrice: 0, discount: 0 }],
            tvaRate: 19
        });
        setShowForm(false);
        setEditingInvoice(null);
    };

    // Page de connexion/inscription
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
                    <h1 className="text-3xl font-bold text-center mb-6">🧾 Système de Facturation</h1>
                    
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setAuthMode('login')}
                            className={`flex-1 py-2 rounded-lg font-semibold ${authMode === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                            Connexion
                        </button>
                        <button
                            onClick={() => setAuthMode('register')}
                            className={`flex-1 py-2 rounded-lg font-semibold ${authMode === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        >
                            Inscription
                        </button>
                    </div>

                    <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                required
                                minLength="6"
                            />
                            {authMode === 'register' && (
                                <p className="text-xs text-gray-500 mt-1">Au moins 6 caractères</p>
                            )}
                        </div>

                        {authError && (
                            <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                        >
                            {authMode === 'login' ? 'Se connecter' : "S'inscrire"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        <p>💾 Vos données seront sauvegardées dans le cloud</p>
                        <p>🌍 Accessibles de partout</p>
                    </div>
                </div>
            </div>
        );
    }

    // Page de chargement
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Chargement de vos données...</div>
            </div>
        );
    }

    const totals = calculateTotals();

    // Interface principale
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* En-tête */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">{companyInfo.name}</h1>
                            <p className="text-sm text-gray-600">{companyInfo.address}</p>
                            <p className="text-sm text-gray-600">Tel: {companyInfo.phone}</p>
                            <p className="text-xs text-gray-500 mt-2">👤 {user.email}</p>
                        </div>
                        <div className="text-right">
                            <div className="bg-blue-100 px-4 py-2 rounded-lg mb-2">
                                <p className="text-sm text-gray-600">Prochaine facture</p>
                                <p className="text-2xl font-bold text-blue-600">FC{currentInvoiceNumber}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                🚪 Déconnexion
                            </button>
                        </div>
                    </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => {
                            if (showForm && !editingInvoice) {
                                resetForm();
                            } else {
                                setEditingInvoice(null);
                                setShowForm(!showForm);
                            }
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                    >
                        {showForm ? 'Annuler' : '+ Nouvelle facture'}
                    </button>
                </div>

                {/* Formulaire */}
                {showForm && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-2xl font-bold mb-6">
                            {editingInvoice ? `Modifier Facture FC${editingInvoice.number}` : `Nouvelle Facture FC${currentInvoiceNumber}`}
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du client *</label>
                                <input
                                    type="text"
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                                <input
                                    type="text"
                                    value={formData.clientAddress}
                                    onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Telephone</label>
                                <input
                                    type="text"
                                    value={formData.clientPhone}
                                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Code TVA</label>
                                <input
                                    type="text"
                                    value={formData.clientCodeTVA}
                                    onChange={(e) => setFormData({ ...formData, clientCodeTVA: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Code Client</label>
                                <input
                                    type="text"
                                    value={formData.clientCode}
                                    onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Chauffeur</label>
                                <input
                                    type="text"
                                    value={formData.chauffeur}
                                    onChange={(e) => setFormData({ ...formData, chauffeur: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicule N°</label>
                                <input
                                    type="text"
                                    value={formData.vehicule}
                                    onChange={(e) => setFormData({ ...formData, vehicule: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">V/REF</label>
                                <input
                                    type="text"
                                    value={formData.vref}
                                    onChange={(e) => setFormData({ ...formData, vref: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Taux TVA (%)</label>
                                <input
                                    type="number"
                                    value={formData.tvaRate}
                                    onChange={(e) => setFormData({ ...formData, tvaRate: parseFloat(e.target.value) })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>

                        {/* Articles */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Articles</h3>
                                <button
                                    onClick={addItem}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                                >
                                    + Ajouter un article
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-medium">Code</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">Designation</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">Qte</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">P.U. HT</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">Rem. %</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium">Total HT</th>
                                            <th className="px-4 py-2"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.items.map((item, index) => (
                                            <tr key={index} className="border-b">
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.code}
                                                        onChange={(e) => updateItem(index, 'code', e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.designation}
                                                        onChange={(e) => updateItem(index, 'designation', e.target.value)}
                                                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => updateItem(index, 'qty', parseFloat(e.target.value))}
                                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                                                        className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                                                        min="0"
                                                        step="0.001"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.discount}
                                                        onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value))}
                                                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                                                        min="0"
                                                        max="100"
                                                        step="0.1"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-sm font-semibold">
                                                    {calculateItemTotal(item).toFixed(3)} TND
                                                </td>
                                                <td className="px-4 py-2">
                                                    <button
                                                        onClick={() => removeItem(index)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totaux */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <div className="flex justify-end">
                                <div className="w-80">
                                    <div className="flex justify-between py-2">
                                        <span className="font-medium">Total HT:</span>
                                        <span className="font-semibold">{totals.totalHT.toFixed(3)} TND</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="font-medium">TVA ({formData.tvaRate}%):</span>
                                        <span className="font-semibold">{totals.totalTVA.toFixed(3)} TND</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="font-medium">Timbre:</span>
                                        <span className="font-semibold">{totals.timbre.toFixed(3)} TND</span>
                                    </div>
                                    <div className="flex justify-between py-3 border-t-2 border-gray-300">
                                        <span className="font-bold text-lg">Total TTC:</span>
                                        <span className="font-bold text-lg text-blue-600">{totals.totalTTC.toFixed(3)} TND</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Boutons */}
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={resetForm}
                                className="bg-gray-400 text-white px-8 py-3 rounded-lg hover:bg-gray-500 transition font-semibold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={saveInvoice}
                                disabled={!formData.clientName || formData.items.some(item => !item.designation)}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {editingInvoice ? 'Modifier la facture' : 'Enregistrer et générer le PDF'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Liste des factures */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-4">Factures enregistrées ({invoices.length})</h2>
                    
                    {invoices.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Aucune facture enregistree pour le moment</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">N° Facture</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Total TTC</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-semibold">FC{invoice.number}</td>
                                            <td className="px-4 py-3">{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
                                            <td className="px-4 py-3">{invoice.clientName}</td>
                                            <td className="px-4 py-3 font-semibold text-blue-600">{invoice.totalTTC.toFixed(3)} TND</td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => downloadInvoicePDF(invoice)}
                                                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition text-sm"
                                                        title="Télécharger PDF"
                                                    >
                                                        📄 PDF
                                                    </button>
                                                    <button
                                                        onClick={() => editInvoice(invoice)}
                                                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition text-sm"
                                                        title="Modifier"
                                                    >
                                                        ✏️ Modifier
                                                    </button>
                                                    <button
                                                        onClick={() => deleteInvoice(invoice)}
                                                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm"
                                                        title="Supprimer"
                                                    >
                                                        🗑️ Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
