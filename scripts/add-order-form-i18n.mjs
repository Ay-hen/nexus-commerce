// scripts/add-order-form-i18n.mjs
// Adds the translations used by the Create Order / Update Order pages to
// public/i18n/{en,fr,es,de}.json:
//   • orders.form.*        (new block)
//   • orders.timeline.updated
// The files are edited as text (not re-serialised), so nothing else in them is
// reformatted. The script is idempotent: running it twice changes nothing.
//
// Usage (from the project root):   node scripts/add-order-form-i18n.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'public', 'i18n');

const T = {
  en: {
    timelineUpdated: 'Order Updated',
    form: {
      backAria: 'Back to orders',
      createButton: 'Create Order',
      saving: 'Saving…',
      createSubtitle: 'Add a new customer order with its items, shipping and payment details.',
      editTitle: 'Edit {{order}}',
      editSubtitle: 'Update items, shipping, payment and notes. Status changes are made from the orders list.',
      sections: {
        customer: 'Customer', items: 'Order Items', shipping: 'Shipping',
        addresses: 'Addresses', payment: 'Payment', notes: 'Assignment & Notes',
      },
      customerLabel: 'Customer',
      customerPlaceholder: 'Select a customer…',
      customerLocked: "The customer of an existing order can't be changed.",
      product: 'Product',
      productPlaceholder: 'Select a product…',
      quantity: 'Quantity',
      lineDiscount: 'Discount',
      lineTotal: 'Line total',
      addItem: 'Add item',
      removeItem: 'Remove item',
      stockAvailable: '{{count}} in stock',
      extraDiscount: 'Additional discount',
      couponCode: 'Coupon code',
      couponPlaceholder: 'e.g. SAVE20',
      shippingMethod: 'Shipping method',
      shippingMethods: { standard: 'Standard', express: 'Express', overnight: 'Overnight', pickup: 'Pickup' },
      fields: {
        name: 'Full name', phone: 'Phone', street: 'Street address', city: 'City',
        state: 'State / Region', zip: 'ZIP / Postal code', country: 'Country',
      },
      billingSame: 'Billing address is the same as shipping',
      paymentMethod: 'Payment method',
      paymentStatus: 'Payment status',
      assignedTo: 'Assigned to',
      notesPlaceholder: 'Add internal notes about this order…',
      discountLabel: 'Discount',
      statusNoteCreate: 'New orders start as Pending. Use “Update Status” in the orders list to move them forward.',
      statusNoteUpdate: 'Status is managed from the orders list (Update Status) so every change is logged in the timeline.',
      lock: {
        readOnly: 'This order is {{status}}, so only the assignee and notes can be edited.',
        pricingPaid: 'Payment has been received, so items, discounts and the shipping method are locked. Refund the order from the orders list if the amount needs to change.',
        pricingPacked: 'This order is already packed or shipped, so items, discounts and the shipping method are locked.',
        paymentSettled: 'Payment has been settled and can no longer be edited here.',
      },
      errors: {
        customerRequired: 'Select a customer.',
        itemsRequired: 'Add at least one item.',
        productRequired: 'Select a product.',
        productDuplicate: 'This product is already in the order.',
        quantityInvalid: 'Enter a whole number of 1 or more.',
        quantityExceedsStock: 'Only {{stock}} in stock.',
        discountNegative: 'Discount cannot be negative.',
        discountTooHigh: "Discount can't exceed the line amount.",
        discountExceedsSubtotal: "Total discount can't exceed the subtotal.",
        couponInvalid: 'Use up to 20 letters, numbers, dashes or underscores.',
        estimatedDeliveryRequired: 'Choose an estimated delivery date.',
        estimatedDeliveryPast: "Delivery can't be before the order date.",
        trackingTooLong: 'Tracking number is too long (max 40 characters).',
        shippingCompanyRequired: 'Select a shipping company.',
        nameRequired: 'Full name is required.',
        phoneRequired: 'Phone number is required.',
        phoneInvalid: 'Enter a valid phone number.',
        streetRequired: 'Street address is required.',
        cityRequired: 'City is required.',
        zipRequired: 'ZIP / postal code is required.',
        zipInvalid: 'ZIP / postal code is too long.',
        countryRequired: 'Country is required.',
        notesTooLong: 'Notes are too long (max 500 characters).',
      },
      timeline: {
        createdByAdmin: 'Order created by admin',
        paymentRecorded: 'Payment recorded by admin',
        updatedFields: 'Updated: {{fields}}',
      },
      changed: {
        items: 'items', pricing: 'pricing', shippingAddress: 'shipping address',
        billingAddress: 'billing address', shipment: 'shipment details',
        payment: 'payment', assignee: 'assignee', notes: 'notes',
      },
      toasts: {
        created: '{{order}} created',
        createFailed: "Couldn't create the order. Please try again.",
        updated: '{{order}} updated',
        updateFailed: "Couldn't save your changes. Please try again.",
        noChanges: 'No changes to save',
      },
      notFound: { title: 'Order not found', body: "This order doesn't exist or may have been deleted." },
      loadFailed: { title: "Couldn't load the order", body: 'Something went wrong while loading this order.' },
      backToOrders: 'Back to orders',
      retry: 'Try again',
    },
  },

  fr: {
    timelineUpdated: 'Commande modifiée',
    form: {
      backAria: 'Retour aux commandes',
      createButton: 'Créer la commande',
      saving: 'Enregistrement…',
      createSubtitle: 'Ajoutez une nouvelle commande client avec ses articles, sa livraison et son paiement.',
      editTitle: 'Modifier {{order}}',
      editSubtitle: 'Mettez à jour les articles, la livraison, le paiement et les notes. Le statut se modifie depuis la liste des commandes.',
      sections: {
        customer: 'Client', items: 'Articles de la commande', shipping: 'Livraison',
        addresses: 'Adresses', payment: 'Paiement', notes: 'Affectation et notes',
      },
      customerLabel: 'Client',
      customerPlaceholder: 'Sélectionner un client…',
      customerLocked: 'Le client d’une commande existante ne peut pas être modifié.',
      product: 'Produit',
      productPlaceholder: 'Sélectionner un produit…',
      quantity: 'Quantité',
      lineDiscount: 'Remise',
      lineTotal: 'Total de la ligne',
      addItem: 'Ajouter un article',
      removeItem: 'Supprimer l’article',
      stockAvailable: '{{count}} en stock',
      extraDiscount: 'Remise supplémentaire',
      couponCode: 'Code promo',
      couponPlaceholder: 'ex. SAVE20',
      shippingMethod: 'Mode de livraison',
      shippingMethods: { standard: 'Standard', express: 'Express', overnight: 'Livraison de nuit', pickup: 'Retrait en magasin' },
      fields: {
        name: 'Nom complet', phone: 'Téléphone', street: 'Adresse', city: 'Ville',
        state: 'État / Région', zip: 'Code postal', country: 'Pays',
      },
      billingSame: 'L’adresse de facturation est identique à l’adresse de livraison',
      paymentMethod: 'Mode de paiement',
      paymentStatus: 'Statut du paiement',
      assignedTo: 'Assignée à',
      notesPlaceholder: 'Ajoutez des notes internes sur cette commande…',
      discountLabel: 'Remise',
      statusNoteCreate: 'Les nouvelles commandes démarrent à « En attente ». Utilisez « Mettre à jour le statut » dans la liste pour les faire avancer.',
      statusNoteUpdate: 'Le statut se gère depuis la liste des commandes (Mettre à jour le statut) afin que chaque changement soit consigné dans l’historique.',
      lock: {
        readOnly: 'Cette commande est « {{status}} » : seuls l’assignation et les notes peuvent être modifiées.',
        pricingPaid: 'Le paiement a été reçu : les articles, remises et le mode de livraison sont verrouillés. Remboursez la commande depuis la liste si le montant doit changer.',
        pricingPacked: 'Cette commande est déjà préparée ou expédiée : les articles, remises et le mode de livraison sont verrouillés.',
        paymentSettled: 'Le paiement est réglé et ne peut plus être modifié ici.',
      },
      errors: {
        customerRequired: 'Sélectionnez un client.',
        itemsRequired: 'Ajoutez au moins un article.',
        productRequired: 'Sélectionnez un produit.',
        productDuplicate: 'Ce produit figure déjà dans la commande.',
        quantityInvalid: 'Saisissez un nombre entier supérieur ou égal à 1.',
        quantityExceedsStock: 'Seulement {{stock}} en stock.',
        discountNegative: 'La remise ne peut pas être négative.',
        discountTooHigh: 'La remise ne peut pas dépasser le montant de la ligne.',
        discountExceedsSubtotal: 'La remise totale ne peut pas dépasser le sous-total.',
        couponInvalid: 'Utilisez jusqu’à 20 lettres, chiffres, tirets ou tirets bas.',
        estimatedDeliveryRequired: 'Choisissez une date de livraison estimée.',
        estimatedDeliveryPast: 'La livraison ne peut pas précéder la date de commande.',
        trackingTooLong: 'Le numéro de suivi est trop long (40 caractères max.).',
        shippingCompanyRequired: 'Sélectionnez un transporteur.',
        nameRequired: 'Le nom complet est obligatoire.',
        phoneRequired: 'Le numéro de téléphone est obligatoire.',
        phoneInvalid: 'Saisissez un numéro de téléphone valide.',
        streetRequired: 'L’adresse est obligatoire.',
        cityRequired: 'La ville est obligatoire.',
        zipRequired: 'Le code postal est obligatoire.',
        zipInvalid: 'Le code postal est trop long.',
        countryRequired: 'Le pays est obligatoire.',
        notesTooLong: 'Les notes sont trop longues (500 caractères max.).',
      },
      timeline: {
        createdByAdmin: 'Commande créée par un administrateur',
        paymentRecorded: 'Paiement enregistré par un administrateur',
        updatedFields: 'Modifié : {{fields}}',
      },
      changed: {
        items: 'articles', pricing: 'tarification', shippingAddress: 'adresse de livraison',
        billingAddress: 'adresse de facturation', shipment: 'détails d’expédition',
        payment: 'paiement', assignee: 'assignation', notes: 'notes',
      },
      toasts: {
        created: '{{order}} créée',
        createFailed: 'Impossible de créer la commande. Veuillez réessayer.',
        updated: '{{order}} mise à jour',
        updateFailed: 'Impossible d’enregistrer vos modifications. Veuillez réessayer.',
        noChanges: 'Aucune modification à enregistrer',
      },
      notFound: { title: 'Commande introuvable', body: 'Cette commande n’existe pas ou a peut-être été supprimée.' },
      loadFailed: { title: 'Impossible de charger la commande', body: 'Une erreur est survenue lors du chargement de cette commande.' },
      backToOrders: 'Retour aux commandes',
      retry: 'Réessayer',
    },
  },

  es: {
    timelineUpdated: 'Pedido actualizado',
    form: {
      backAria: 'Volver a los pedidos',
      createButton: 'Crear pedido',
      saving: 'Guardando…',
      createSubtitle: 'Añade un nuevo pedido de cliente con sus artículos, envío y pago.',
      editTitle: 'Editar {{order}}',
      editSubtitle: 'Actualiza artículos, envío, pago y notas. El estado se cambia desde la lista de pedidos.',
      sections: {
        customer: 'Cliente', items: 'Artículos del pedido', shipping: 'Envío',
        addresses: 'Direcciones', payment: 'Pago', notes: 'Asignación y notas',
      },
      customerLabel: 'Cliente',
      customerPlaceholder: 'Selecciona un cliente…',
      customerLocked: 'El cliente de un pedido existente no se puede cambiar.',
      product: 'Producto',
      productPlaceholder: 'Selecciona un producto…',
      quantity: 'Cantidad',
      lineDiscount: 'Descuento',
      lineTotal: 'Total de la línea',
      addItem: 'Añadir artículo',
      removeItem: 'Quitar artículo',
      stockAvailable: '{{count}} en stock',
      extraDiscount: 'Descuento adicional',
      couponCode: 'Código de cupón',
      couponPlaceholder: 'p. ej. SAVE20',
      shippingMethod: 'Método de envío',
      shippingMethods: { standard: 'Estándar', express: 'Exprés', overnight: 'Al día siguiente', pickup: 'Recogida en tienda' },
      fields: {
        name: 'Nombre completo', phone: 'Teléfono', street: 'Dirección', city: 'Ciudad',
        state: 'Estado / Región', zip: 'Código postal', country: 'País',
      },
      billingSame: 'La dirección de facturación es la misma que la de envío',
      paymentMethod: 'Método de pago',
      paymentStatus: 'Estado del pago',
      assignedTo: 'Asignado a',
      notesPlaceholder: 'Añade notas internas sobre este pedido…',
      discountLabel: 'Descuento',
      statusNoteCreate: 'Los pedidos nuevos empiezan como Pendiente. Usa «Actualizar estado» en la lista de pedidos para avanzarlos.',
      statusNoteUpdate: 'El estado se gestiona desde la lista de pedidos (Actualizar estado) para que cada cambio quede registrado en la cronología.',
      lock: {
        readOnly: 'Este pedido está «{{status}}», así que solo se pueden editar el responsable y las notas.',
        pricingPaid: 'El pago ya se ha recibido, por lo que los artículos, descuentos y el método de envío están bloqueados. Reembolsa el pedido desde la lista si hay que cambiar el importe.',
        pricingPacked: 'Este pedido ya está preparado o enviado, por lo que los artículos, descuentos y el método de envío están bloqueados.',
        paymentSettled: 'El pago ya está liquidado y no se puede editar aquí.',
      },
      errors: {
        customerRequired: 'Selecciona un cliente.',
        itemsRequired: 'Añade al menos un artículo.',
        productRequired: 'Selecciona un producto.',
        productDuplicate: 'Este producto ya está en el pedido.',
        quantityInvalid: 'Introduce un número entero igual o mayor que 1.',
        quantityExceedsStock: 'Solo hay {{stock}} en stock.',
        discountNegative: 'El descuento no puede ser negativo.',
        discountTooHigh: 'El descuento no puede superar el importe de la línea.',
        discountExceedsSubtotal: 'El descuento total no puede superar el subtotal.',
        couponInvalid: 'Usa hasta 20 letras, números, guiones o guiones bajos.',
        estimatedDeliveryRequired: 'Elige una fecha de entrega estimada.',
        estimatedDeliveryPast: 'La entrega no puede ser anterior a la fecha del pedido.',
        trackingTooLong: 'El número de seguimiento es demasiado largo (máx. 40 caracteres).',
        shippingCompanyRequired: 'Selecciona una empresa de envío.',
        nameRequired: 'El nombre completo es obligatorio.',
        phoneRequired: 'El teléfono es obligatorio.',
        phoneInvalid: 'Introduce un teléfono válido.',
        streetRequired: 'La dirección es obligatoria.',
        cityRequired: 'La ciudad es obligatoria.',
        zipRequired: 'El código postal es obligatorio.',
        zipInvalid: 'El código postal es demasiado largo.',
        countryRequired: 'El país es obligatorio.',
        notesTooLong: 'Las notas son demasiado largas (máx. 500 caracteres).',
      },
      timeline: {
        createdByAdmin: 'Pedido creado por un administrador',
        paymentRecorded: 'Pago registrado por un administrador',
        updatedFields: 'Actualizado: {{fields}}',
      },
      changed: {
        items: 'artículos', pricing: 'precios', shippingAddress: 'dirección de envío',
        billingAddress: 'dirección de facturación', shipment: 'datos del envío',
        payment: 'pago', assignee: 'responsable', notes: 'notas',
      },
      toasts: {
        created: '{{order}} creado',
        createFailed: 'No se pudo crear el pedido. Inténtalo de nuevo.',
        updated: '{{order}} actualizado',
        updateFailed: 'No se pudieron guardar los cambios. Inténtalo de nuevo.',
        noChanges: 'No hay cambios que guardar',
      },
      notFound: { title: 'Pedido no encontrado', body: 'Este pedido no existe o puede haber sido eliminado.' },
      loadFailed: { title: 'No se pudo cargar el pedido', body: 'Algo salió mal al cargar este pedido.' },
      backToOrders: 'Volver a los pedidos',
      retry: 'Reintentar',
    },
  },

  de: {
    timelineUpdated: 'Bestellung aktualisiert',
    form: {
      backAria: 'Zurück zu den Bestellungen',
      createButton: 'Bestellung erstellen',
      saving: 'Wird gespeichert…',
      createSubtitle: 'Neue Kundenbestellung mit Artikeln, Versand- und Zahlungsdetails anlegen.',
      editTitle: '{{order}} bearbeiten',
      editSubtitle: 'Artikel, Versand, Zahlung und Notizen aktualisieren. Statusänderungen erfolgen in der Bestellliste.',
      sections: {
        customer: 'Kunde', items: 'Bestellpositionen', shipping: 'Versand',
        addresses: 'Adressen', payment: 'Zahlung', notes: 'Zuweisung & Notizen',
      },
      customerLabel: 'Kunde',
      customerPlaceholder: 'Kunden auswählen…',
      customerLocked: 'Der Kunde einer bestehenden Bestellung kann nicht geändert werden.',
      product: 'Produkt',
      productPlaceholder: 'Produkt auswählen…',
      quantity: 'Menge',
      lineDiscount: 'Rabatt',
      lineTotal: 'Positionssumme',
      addItem: 'Artikel hinzufügen',
      removeItem: 'Artikel entfernen',
      stockAvailable: '{{count}} auf Lager',
      extraDiscount: 'Zusätzlicher Rabatt',
      couponCode: 'Gutscheincode',
      couponPlaceholder: 'z. B. SAVE20',
      shippingMethod: 'Versandart',
      shippingMethods: { standard: 'Standard', express: 'Express', overnight: 'Über Nacht', pickup: 'Abholung' },
      fields: {
        name: 'Vollständiger Name', phone: 'Telefon', street: 'Straße und Hausnummer', city: 'Stadt',
        state: 'Bundesland / Region', zip: 'Postleitzahl', country: 'Land',
      },
      billingSame: 'Rechnungsadresse ist identisch mit der Lieferadresse',
      paymentMethod: 'Zahlungsart',
      paymentStatus: 'Zahlungsstatus',
      assignedTo: 'Zugewiesen an',
      notesPlaceholder: 'Interne Notizen zu dieser Bestellung hinzufügen…',
      discountLabel: 'Rabatt',
      statusNoteCreate: 'Neue Bestellungen starten als „Ausstehend“. Verwenden Sie „Status aktualisieren“ in der Bestellliste, um sie voranzubringen.',
      statusNoteUpdate: 'Der Status wird in der Bestellliste verwaltet (Status aktualisieren), damit jede Änderung im Verlauf protokolliert wird.',
      lock: {
        readOnly: 'Diese Bestellung ist „{{status}}“, daher können nur Zuweisung und Notizen bearbeitet werden.',
        pricingPaid: 'Die Zahlung ist eingegangen, daher sind Artikel, Rabatte und Versandart gesperrt. Erstatten Sie die Bestellung in der Liste, falls sich der Betrag ändern muss.',
        pricingPacked: 'Diese Bestellung ist bereits gepackt oder versendet, daher sind Artikel, Rabatte und Versandart gesperrt.',
        paymentSettled: 'Die Zahlung ist abgeschlossen und kann hier nicht mehr bearbeitet werden.',
      },
      errors: {
        customerRequired: 'Bitte wählen Sie einen Kunden aus.',
        itemsRequired: 'Fügen Sie mindestens einen Artikel hinzu.',
        productRequired: 'Bitte wählen Sie ein Produkt aus.',
        productDuplicate: 'Dieses Produkt ist bereits in der Bestellung.',
        quantityInvalid: 'Geben Sie eine ganze Zahl ab 1 ein.',
        quantityExceedsStock: 'Nur {{stock}} auf Lager.',
        discountNegative: 'Der Rabatt darf nicht negativ sein.',
        discountTooHigh: 'Der Rabatt darf den Positionsbetrag nicht übersteigen.',
        discountExceedsSubtotal: 'Der Gesamtrabatt darf die Zwischensumme nicht übersteigen.',
        couponInvalid: 'Bis zu 20 Buchstaben, Zahlen, Bindestriche oder Unterstriche verwenden.',
        estimatedDeliveryRequired: 'Wählen Sie ein voraussichtliches Lieferdatum.',
        estimatedDeliveryPast: 'Die Lieferung darf nicht vor dem Bestelldatum liegen.',
        trackingTooLong: 'Die Sendungsnummer ist zu lang (max. 40 Zeichen).',
        shippingCompanyRequired: 'Bitte wählen Sie ein Versandunternehmen aus.',
        nameRequired: 'Der vollständige Name ist erforderlich.',
        phoneRequired: 'Die Telefonnummer ist erforderlich.',
        phoneInvalid: 'Geben Sie eine gültige Telefonnummer ein.',
        streetRequired: 'Straße und Hausnummer sind erforderlich.',
        cityRequired: 'Die Stadt ist erforderlich.',
        zipRequired: 'Die Postleitzahl ist erforderlich.',
        zipInvalid: 'Die Postleitzahl ist zu lang.',
        countryRequired: 'Das Land ist erforderlich.',
        notesTooLong: 'Die Notizen sind zu lang (max. 500 Zeichen).',
      },
      timeline: {
        createdByAdmin: 'Bestellung von einem Administrator erstellt',
        paymentRecorded: 'Zahlung von einem Administrator erfasst',
        updatedFields: 'Aktualisiert: {{fields}}',
      },
      changed: {
        items: 'Artikel', pricing: 'Preise', shippingAddress: 'Lieferadresse',
        billingAddress: 'Rechnungsadresse', shipment: 'Versanddetails',
        payment: 'Zahlung', assignee: 'Zuweisung', notes: 'Notizen',
      },
      toasts: {
        created: '{{order}} erstellt',
        createFailed: 'Die Bestellung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
        updated: '{{order}} aktualisiert',
        updateFailed: 'Ihre Änderungen konnten nicht gespeichert werden. Bitte versuchen Sie es erneut.',
        noChanges: 'Keine Änderungen zu speichern',
      },
      notFound: { title: 'Bestellung nicht gefunden', body: 'Diese Bestellung existiert nicht oder wurde möglicherweise gelöscht.' },
      loadFailed: { title: 'Bestellung konnte nicht geladen werden', body: 'Beim Laden dieser Bestellung ist ein Fehler aufgetreten.' },
      backToOrders: 'Zurück zu den Bestellungen',
      retry: 'Erneut versuchen',
    },
  },
};

// ── Text-level insertion (keeps each file's formatting and line endings) ─────
for (const [lang, t] of Object.entries(T)) {
  const file = join(DIR, `${lang}.json`);
  const raw = readFileSync(file, 'utf8');
  const nl = raw.includes('\r\n') ? '\r\n' : '\n';
  const parsed = JSON.parse(raw);

  if (parsed.orders?.form) {
    console.log(`${lang}.json: orders.form already present — skipped`);
    continue;
  }

  const lines = raw.split(nl);
  const ordersIdx = lines.findIndex(l => /^(\s*)"orders":\s*\{\s*$/.test(l));
  if (ordersIdx < 0) throw new Error(`${lang}.json: could not find the "orders" block`);
  const ordersIndent = lines[ordersIdx].match(/^(\s*)/)[1];
  const unit = ordersIndent.length > 0 ? ordersIndent : '  ';
  const childIndent = ordersIndent + unit;

  // 1) orders.timeline.updated — first key of orders.timeline
  const tlIdx = lines.findIndex((l, i) => i > ordersIdx && l === `${childIndent}"timeline": {`);
  if (tlIdx < 0) throw new Error(`${lang}.json: could not find orders.timeline`);

  // 2) orders.form — first child of orders
  const formJson = JSON.stringify({ form: t.form }, null, unit.length)
    .split('\n').slice(1, -1)                       // drop the outer { }
    .map(l => ordersIndent + l)                     // re-indent under "orders"
    .join(nl) + ',';

  // Apply the later edit first so earlier indexes stay valid.
  lines.splice(tlIdx + 1, 0, `${childIndent}${unit}"updated": ${JSON.stringify(t.timelineUpdated)},`);
  lines.splice(ordersIdx + 1, 0, formJson);

  const out = lines.join(nl);
  const check = JSON.parse(out);                    // must still be valid JSON
  if (!check.orders.form || !check.orders.timeline.updated) throw new Error(`${lang}.json: insertion failed`);
  writeFileSync(file, out, 'utf8');
  console.log(`${lang}.json: added orders.form + orders.timeline.updated`);
}
