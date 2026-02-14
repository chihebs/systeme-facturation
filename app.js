const { useState, useEffect } = React;
const { jsPDF } = window.jspdf;

function App() {
    const [loading, setLoading] = useState(true);
    const [currentInvoiceNumber, setCurrentInvoiceNumber] = useState(1);
    const [invoices, setInvoices] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [companyInfo, setCompanyInfo] = useState({
        name: "Ste Walk",
        address: "Walk route Gabes km 7 cité el moez1 Sfax SUD, Sfax 3083",
        phone: "21 413 434",
        codeTVA: "",
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

    // Charger les données au démarrage
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        try {
            // Charger depuis localStorage
            const invoiceNum = localStorage.getItem('invoice-number');
            const invoicesList = localStorage.getItem('invoices-list');
            const company = localStorage.getItem('company-info');

            if (invoiceNum) {
                setCurrentInvoiceNumber(parseInt(invoiceNum));
            }
            if (invoicesList) {
                setInvoices(JSON.parse(invoicesList));
            }
            if (company) {
                setCompanyInfo(JSON.parse(company));
            }
            
            console.log('Données chargées:', {
                numeroFacture: invoiceNum,
                nombreFactures: invoicesList ? JSON.parse(invoicesList).length : 0
            });
        } catch (error) {
            console.log('Première utilisation - initialisation des données');
        }
        setLoading(false);
    };

    const saveInvoiceNumber = (num) => {
        try {
            localStorage.setItem('invoice-number', num.toString());
            console.log('Numéro de facture sauvegardé:', num);
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
        }
    };

    const saveInvoicesList = (list) => {
        try {
            localStorage.setItem('invoices-list', JSON.stringify(list));
            console.log('Liste des factures sauvegardée:', list.length, 'factures');
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
        }
    };

    const saveCompanyInfo = (info) => {
        try {
            localStorage.setItem('company-info', JSON.stringify(info));
            setCompanyInfo(info);
            console.log('Informations entreprise sauvegardées');
        } catch (error) {
            console.error('Erreur de sauvegarde:', error);
        }
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
        
        // En-tête entreprise
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

        // Numéro de facture
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`FACTURE N° : FC${invoice.number}`, pageWidth - 60, 20);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Date : ${invoice.date}`, pageWidth - 60, 27);
        doc.text(`Page N° : 1`, pageWidth - 60, 32);

        // Informations client
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

        // Informations supplémentaires
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

        // Tableau des articles
        y += 10;
        const tableStartY = y;
        
        // En-tête du tableau
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

        // Lignes des articles
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

        // Totaux
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

        // Montant en lettres
        y += 15;
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text(`Arrete la presente facture a la somme de ${numberToWords(invoice.totalTTC)} dinars`, 20, y, { maxWidth: pageWidth - 40 });

        // Mentions légales
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

        // Signatures
        const signY = doc.internal.pageSize.height - 30;
        doc.text('Signature et cachet du client', 30, signY);
        doc.text('Signature de responsable', pageWidth - 80, signY);

        return doc;
    };

    const numberToWords = (num) => {
        const units = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
        const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
        const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
        
        const integer = Math.floor(num);
        if (integer < 10) return units[integer];
        if (integer < 20) return teens[integer - 10];
        if (integer < 100) {
            const ten = Math.floor(integer / 10);
            const unit = integer % 10;
            return unit === 0 ? tens[ten] : `${tens[ten]}-${units[unit]}`;
        }
        return integer.toString();
    };

    const saveInvoice = () => {
        const totals = calculateTotals();
        const invoice = {
            number: currentInvoiceNumber,
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
            createdAt: new Date().toISOString()
        };

        const newInvoices = [invoice, ...invoices];
        setInvoices(newInvoices);
        saveInvoicesList(newInvoices);
        
        const newNumber = currentInvoiceNumber + 1;
        setCurrentInvoiceNumber(newNumber);
        saveInvoiceNumber(newNumber);

        // Générer et télécharger le PDF
        const doc = generatePDF(invoice);
        doc.save(`Facture_FC${invoice.number}_${invoice.clientName.replace(/\s/g, '_')}.pdf`);

        // Réinitialiser le formulaire
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
        
        alert('Facture enregistrée avec succès !');
    };

    const downloadInvoicePDF = (invoice) => {
        const doc = generatePDF(invoice);
        doc.save(`Facture_FC${invoice.number}_${invoice.clientName.replace(/\s/g, '_')}.pdf`);
    };

    const resetData = () => {
        if (confirm('Etes-vous sur de vouloir reinitialiser toutes les donnees ? Cette action est irreversible.')) {
            try {
                localStorage.removeItem('invoice-number');
                localStorage.removeItem('invoices-list');
                localStorage.removeItem('company-info');
                setCurrentInvoiceNumber(1);
                setInvoices([]);
                alert('Donnees reinitialisees avec succes');
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur lors de la reinitialisation');
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-xl text-gray-600">Chargement...</div>
            </div>
        );
    }

    const totals = calculateTotals();

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
                        </div>
                        <div className="text-right">
                            <div className="bg-blue-100 px-4 py-2 rounded-lg">
                                <p className="text-sm text-gray-600">Prochaine facture</p>
                                <p className="text-2xl font-bold text-blue-600">FC{currentInvoiceNumber}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                    >
                        {showForm ? 'Masquer le formulaire' : '+ Nouvelle facture'}
                    </button>
                    <button
                        onClick={resetData}
                        className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
                    >
                        Reinitialiser les donnees
                    </button>
                </div>

                {/* Formulaire de facture */}
                {showForm && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-2xl font-bold mb-6">Nouvelle Facture FC{currentInvoiceNumber}</h2>
                        
                        {/* Informations client */}
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

                        {/* Bouton de sauvegarde */}
                        <div className="flex justify-end">
                            <button
                                onClick={saveInvoice}
                                disabled={!formData.clientName || formData.items.some(item => !item.designation)}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Enregistrer et generer le PDF
                            </button>
                        </div>
                    </div>
                )}

                {/* Liste des factures */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-4">Factures enregistrees ({invoices.length})</h2>
                    
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
                                        <tr key={invoice.number} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-semibold">FC{invoice.number}</td>
                                            <td className="px-4 py-3">{new Date(invoice.date).toLocaleDateString('fr-FR')}</td>
                                            <td className="px-4 py-3">{invoice.clientName}</td>
                                            <td className="px-4 py-3 font-semibold text-blue-600">{invoice.totalTTC.toFixed(3)} TND</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => downloadInvoicePDF(invoice)}
                                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm"
                                                >
                                                    📄 Telecharger PDF
                                                </button>
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
