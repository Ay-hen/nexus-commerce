// scripts/complete-reviews-i18n.mjs
// Completes the "reviews" block of public/i18n/{en,fr,es,de}.json.
//
//  • Keys that already exist in a file are NEVER changed (your wording wins).
//  • Only missing keys are added; keys the script doesn't know about are kept.
//  • Only the "reviews" block is rewritten — the rest of each file is untouched
//    and its line endings (LF / CRLF) are preserved.
//  • Idempotent: running it twice changes nothing.
//
// Usage (from the project root):   node scripts/complete-reviews-i18n.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'public', 'i18n');

const T = {
  // ───────────────────────────── English ─────────────────────────────
  en: {
    title: 'Reviews',
    subtitle: 'Manage customer reviews and moderation.',
    stats: {
      totalReviews: 'Total Reviews', averageRating: 'Average Rating',
      pendingModeration: 'Pending Moderation', featuredReviews: 'Featured Reviews',
    },
    acrossAllProducts: 'across all products',
    averageAcrossAll: 'average across all reviews',
    awaitingReview: 'awaiting review',
    status: { new: 'New', read: 'Read', approved: 'Approved', featured: 'Featured', flagged: 'Flagged' },
    actions: {
      viewReview: 'View Review', markRead: 'Mark as Read', approve: 'Approve', feature: 'Feature',
      flag: 'Flag', delete: 'Delete', deleteSelected: 'Delete Selected',
    },
    searchPlaceholder: 'Search reviews…',
    searchColon: 'Search by:',
    searchFields: {
      all: 'All Fields', customer: 'Customer', email: 'Email', product: 'Product',
      title: 'Review Title', review: 'Review Text',
    },
    filterAll: 'All',
    filters: {
      title: 'Filters', rating: 'Rating', status: 'Status', verifiedPurchase: 'Verified Purchase',
      reported: 'Reported', yes: 'Yes', no: 'No', clear: 'Clear Filters', apply: 'Apply Filters',
      active: 'Active Filters',
    },
    verifiedAll: 'All Purchases',
    verifiedOnly: 'Verified Only',
    sort: { ratingHigh: 'Highest Rating', ratingLow: 'Lowest Rating', product: 'Product', helpful: 'Most Helpful' },
    view: { table: 'Table View', grid: 'Grid View' },
    tableRating: 'Rating',
    empty: { title: 'No reviews found', subtitle: 'Try adjusting your filters or search.', clearFilters: 'Clear Filters' },
    verified: 'Verified',
    notVerified: 'Not Verified',
    reported: 'Reported',
    notReported: 'Not Reported',
    rating: '{{rating}} stars',
    helpfulVotes: '{{count}} helpful votes',
    customer: 'Customer',
    product: 'Product',
    reviewTitle: 'Review Title',
    reviewBody: 'Review',
    date: 'Date',
    deleteConfirmTitle: 'Delete Review',
    deleteConfirmBodySingle: 'Are you sure you want to delete the review by {{name}} for {{product}}? This action cannot be undone.',
    deleteConfirmBodyBulk: 'Are you sure you want to delete {{count}} selected reviews? This action cannot be undone.',
    csv: {
      product: 'Product', rating: 'Rating', verified: 'Verified Purchase', helpfulVotes: 'Helpful Votes',
      date: 'Date', reviewTitle: 'Review Title', reviewBody: 'Review',
    },
    toasts: {
      markedRead: 'Review by {{name}} marked as read.',
      approved: 'Review by {{name}} approved.',
      featured: 'Review by {{name}} featured.',
      flagged: 'Review by {{name}} flagged.',
      deleted: 'Review by {{name}} deleted.',
      bulkDeleted: '{{count}} reviews deleted.',
      bulkMarkedRead: 'Selected reviews marked as read.',
      bulkApproved: 'Selected reviews approved.',
      bulkFeatured: 'Selected reviews featured.',
      bulkActionCount: '{{label}} for {{count}} reviews.',
      reportDownloaded: 'Review report downloaded successfully.',
      csvExported: 'Reviews exported to CSV successfully.',
    },
  },

  // ───────────────────────────── Français ─────────────────────────────
  fr: {
    title: 'Avis',
    subtitle: 'Gérez les avis clients et leur modération.',
    stats: {
      totalReviews: 'Total des avis', averageRating: 'Note moyenne',
      pendingModeration: 'En attente de modération', featuredReviews: 'Avis mis en avant',
    },
    acrossAllProducts: 'sur tous les produits',
    averageAcrossAll: 'moyenne de tous les avis',
    awaitingReview: 'en attente de vérification',
    status: { new: 'Nouveau', read: 'Lu', approved: 'Approuvé', featured: 'Mis en avant', flagged: 'Signalé' },
    actions: {
      viewReview: 'Voir l’avis', markRead: 'Marquer comme lu', approve: 'Approuver', feature: 'Mettre en avant',
      flag: 'Signaler', delete: 'Supprimer', deleteSelected: 'Supprimer la sélection',
    },
    searchPlaceholder: 'Rechercher des avis…',
    searchColon: 'Rechercher par :',
    searchFields: {
      all: 'Tous les champs', customer: 'Client', email: 'E-mail', product: 'Produit',
      title: 'Titre de l’avis', review: 'Texte de l’avis',
    },
    filterAll: 'Tous',
    filters: {
      title: 'Filtres', rating: 'Note', status: 'Statut', verifiedPurchase: 'Achat vérifié',
      reported: 'Signalé', yes: 'Oui', no: 'Non', clear: 'Effacer les filtres', apply: 'Appliquer les filtres',
      active: 'Filtres actifs',
    },
    verifiedAll: 'Tous les achats',
    verifiedOnly: 'Achats vérifiés uniquement',
    sort: { ratingHigh: 'Meilleure note', ratingLow: 'Moins bonne note', product: 'Produit', helpful: 'Plus utiles' },
    view: { table: 'Vue tableau', grid: 'Vue grille' },
    tableRating: 'Note',
    empty: { title: 'Aucun avis trouvé', subtitle: 'Essayez de modifier vos filtres ou votre recherche.', clearFilters: 'Effacer les filtres' },
    verified: 'Vérifié',
    notVerified: 'Non vérifié',
    reported: 'Signalé',
    notReported: 'Non signalé',
    rating: '{{rating}} étoiles',
    helpfulVotes: '{{count}} votes utiles',
    customer: 'Client',
    product: 'Produit',
    reviewTitle: 'Titre de l’avis',
    reviewBody: 'Avis',
    date: 'Date',
    deleteConfirmTitle: 'Supprimer l’avis',
    deleteConfirmBodySingle: 'Voulez-vous vraiment supprimer l’avis de {{name}} sur {{product}} ? Cette action est irréversible.',
    deleteConfirmBodyBulk: 'Voulez-vous vraiment supprimer les {{count}} avis sélectionnés ? Cette action est irréversible.',
    csv: {
      product: 'Produit', rating: 'Note', verified: 'Achat vérifié', helpfulVotes: 'Votes utiles',
      date: 'Date', reviewTitle: 'Titre de l’avis', reviewBody: 'Avis',
    },
    toasts: {
      markedRead: 'L’avis de {{name}} a été marqué comme lu.',
      approved: 'L’avis de {{name}} a été approuvé.',
      featured: 'L’avis de {{name}} a été mis en avant.',
      flagged: 'L’avis de {{name}} a été signalé.',
      deleted: 'L’avis de {{name}} a été supprimé.',
      bulkDeleted: '{{count}} avis supprimés.',
      bulkMarkedRead: 'Les avis sélectionnés ont été marqués comme lus.',
      bulkApproved: 'Les avis sélectionnés ont été approuvés.',
      bulkFeatured: 'Les avis sélectionnés ont été mis en avant.',
      bulkActionCount: '{{label}} pour {{count}} avis.',
      reportDownloaded: 'Rapport des avis téléchargé avec succès.',
      csvExported: 'Avis exportés en CSV avec succès.',
    },
  },

  // ───────────────────────────── Español ─────────────────────────────
  es: {
    title: 'Reseñas',
    subtitle: 'Gestiona las reseñas de los clientes y su moderación.',
    stats: {
      totalReviews: 'Total de reseñas', averageRating: 'Valoración media',
      pendingModeration: 'Pendientes de moderación', featuredReviews: 'Reseñas destacadas',
    },
    acrossAllProducts: 'en todos los productos',
    averageAcrossAll: 'media de todas las reseñas',
    awaitingReview: 'pendientes de revisión',
    status: { new: 'Nueva', read: 'Leída', approved: 'Aprobada', featured: 'Destacada', flagged: 'Marcada' },
    actions: {
      viewReview: 'Ver reseña', markRead: 'Marcar como leída', approve: 'Aprobar', feature: 'Destacar',
      flag: 'Marcar', delete: 'Eliminar', deleteSelected: 'Eliminar seleccionadas',
    },
    searchPlaceholder: 'Buscar reseñas…',
    searchColon: 'Buscar por:',
    searchFields: {
      all: 'Todos los campos', customer: 'Cliente', email: 'Correo electrónico', product: 'Producto',
      title: 'Título de la reseña', review: 'Texto de la reseña',
    },
    filterAll: 'Todas',
    filters: {
      title: 'Filtros', rating: 'Valoración', status: 'Estado', verifiedPurchase: 'Compra verificada',
      reported: 'Denunciada', yes: 'Sí', no: 'No', clear: 'Borrar filtros', apply: 'Aplicar filtros',
      active: 'Filtros activos',
    },
    verifiedAll: 'Todas las compras',
    verifiedOnly: 'Solo verificadas',
    sort: { ratingHigh: 'Mayor valoración', ratingLow: 'Menor valoración', product: 'Producto', helpful: 'Más útiles' },
    view: { table: 'Vista de tabla', grid: 'Vista de cuadrícula' },
    tableRating: 'Valoración',
    empty: { title: 'No se encontraron reseñas', subtitle: 'Prueba a ajustar los filtros o la búsqueda.', clearFilters: 'Borrar filtros' },
    verified: 'Verificada',
    notVerified: 'No verificada',
    reported: 'Denunciada',
    notReported: 'No denunciada',
    rating: '{{rating}} estrellas',
    helpfulVotes: '{{count}} votos útiles',
    customer: 'Cliente',
    product: 'Producto',
    reviewTitle: 'Título de la reseña',
    reviewBody: 'Reseña',
    date: 'Fecha',
    deleteConfirmTitle: 'Eliminar reseña',
    deleteConfirmBodySingle: '¿Seguro que quieres eliminar la reseña de {{name}} sobre {{product}}? Esta acción no se puede deshacer.',
    deleteConfirmBodyBulk: '¿Seguro que quieres eliminar las {{count}} reseñas seleccionadas? Esta acción no se puede deshacer.',
    csv: {
      product: 'Producto', rating: 'Valoración', verified: 'Compra verificada', helpfulVotes: 'Votos útiles',
      date: 'Fecha', reviewTitle: 'Título de la reseña', reviewBody: 'Reseña',
    },
    toasts: {
      markedRead: 'La reseña de {{name}} se marcó como leída.',
      approved: 'La reseña de {{name}} fue aprobada.',
      featured: 'La reseña de {{name}} fue destacada.',
      flagged: 'La reseña de {{name}} fue marcada.',
      deleted: 'La reseña de {{name}} fue eliminada.',
      bulkDeleted: '{{count}} reseñas eliminadas.',
      bulkMarkedRead: 'Las reseñas seleccionadas se marcaron como leídas.',
      bulkApproved: 'Las reseñas seleccionadas fueron aprobadas.',
      bulkFeatured: 'Las reseñas seleccionadas fueron destacadas.',
      bulkActionCount: '{{label}} para {{count}} reseñas.',
      reportDownloaded: 'Informe de reseñas descargado correctamente.',
      csvExported: 'Reseñas exportadas a CSV correctamente.',
    },
  },

  // ───────────────────────────── Deutsch ─────────────────────────────
  de: {
    title: 'Bewertungen',
    subtitle: 'Kundenbewertungen verwalten und moderieren.',
    stats: {
      totalReviews: 'Bewertungen gesamt', averageRating: 'Durchschnittliche Bewertung',
      pendingModeration: 'Moderation ausstehend', featuredReviews: 'Hervorgehobene Bewertungen',
    },
    acrossAllProducts: 'über alle Produkte',
    averageAcrossAll: 'Durchschnitt aller Bewertungen',
    awaitingReview: 'warten auf Prüfung',
    status: { new: 'Neu', read: 'Gelesen', approved: 'Genehmigt', featured: 'Hervorgehoben', flagged: 'Markiert' },
    actions: {
      viewReview: 'Bewertung ansehen', markRead: 'Als gelesen markieren', approve: 'Genehmigen',
      feature: 'Hervorheben', flag: 'Markieren', delete: 'Löschen', deleteSelected: 'Auswahl löschen',
    },
    searchPlaceholder: 'Bewertungen durchsuchen…',
    searchColon: 'Suchen nach:',
    searchFields: {
      all: 'Alle Felder', customer: 'Kunde', email: 'E-Mail', product: 'Produkt',
      title: 'Bewertungstitel', review: 'Bewertungstext',
    },
    filterAll: 'Alle',
    filters: {
      title: 'Filter', rating: 'Bewertung', status: 'Status', verifiedPurchase: 'Verifizierter Kauf',
      reported: 'Gemeldet', yes: 'Ja', no: 'Nein', clear: 'Filter zurücksetzen', apply: 'Filter anwenden',
      active: 'Aktive Filter',
    },
    verifiedAll: 'Alle Käufe',
    verifiedOnly: 'Nur verifizierte',
    sort: { ratingHigh: 'Beste Bewertung', ratingLow: 'Schlechteste Bewertung', product: 'Produkt', helpful: 'Hilfreichste' },
    view: { table: 'Tabellenansicht', grid: 'Rasteransicht' },
    tableRating: 'Bewertung',
    empty: { title: 'Keine Bewertungen gefunden', subtitle: 'Passen Sie Ihre Filter oder Suche an.', clearFilters: 'Filter zurücksetzen' },
    verified: 'Verifiziert',
    notVerified: 'Nicht verifiziert',
    reported: 'Gemeldet',
    notReported: 'Nicht gemeldet',
    rating: '{{rating}} Sterne',
    helpfulVotes: '{{count}} hilfreiche Stimmen',
    customer: 'Kunde',
    product: 'Produkt',
    reviewTitle: 'Bewertungstitel',
    reviewBody: 'Bewertung',
    date: 'Datum',
    deleteConfirmTitle: 'Bewertung löschen',
    deleteConfirmBodySingle: 'Möchten Sie die Bewertung von {{name}} für {{product}} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    deleteConfirmBodyBulk: 'Möchten Sie die {{count}} ausgewählten Bewertungen wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    csv: {
      product: 'Produkt', rating: 'Bewertung', verified: 'Verifizierter Kauf', helpfulVotes: 'Hilfreiche Stimmen',
      date: 'Datum', reviewTitle: 'Bewertungstitel', reviewBody: 'Bewertung',
    },
    toasts: {
      markedRead: 'Bewertung von {{name}} als gelesen markiert.',
      approved: 'Bewertung von {{name}} genehmigt.',
      featured: 'Bewertung von {{name}} hervorgehoben.',
      flagged: 'Bewertung von {{name}} markiert.',
      deleted: 'Bewertung von {{name}} gelöscht.',
      bulkDeleted: '{{count}} Bewertungen gelöscht.',
      bulkMarkedRead: 'Ausgewählte Bewertungen als gelesen markiert.',
      bulkApproved: 'Ausgewählte Bewertungen genehmigt.',
      bulkFeatured: 'Ausgewählte Bewertungen hervorgehoben.',
      bulkActionCount: '{{label}} für {{count}} Bewertungen.',
      reportDownloaded: 'Bewertungsbericht erfolgreich heruntergeladen.',
      csvExported: 'Bewertungen erfolgreich als CSV exportiert.',
    },
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

/** Adds keys from `extra` that are missing in `base`; never changes existing values. */
function fillMissing(base, extra, path = '', added = []) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (!(k in out)) { out[k] = v; added.push(path + k); }
    else if (isObj(out[k]) && isObj(v)) out[k] = fillMissing(out[k], v, path + k + '.', added);
  }
  return out;
}

/** Finds the end index (exclusive) of the JSON object that starts at `start` (a '{'). */
function findObjectEnd(text, start) {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i + 1;
  }
  throw new Error('Unbalanced braces');
}

for (const [lang, full] of Object.entries(T)) {
  const file = join(DIR, `${lang}.json`);
  const raw = readFileSync(file, 'utf8');
  const nl = raw.includes('\r\n') ? '\r\n' : '\n';
  const parsed = JSON.parse(raw);

  const m = /^([ \t]*)"reviews"\s*:\s*\{/m.exec(raw);
  if (!m) throw new Error(`${lang}.json: no "reviews" block found`);
  const lineIndent = m[1];
  const start = m.index + m[0].length - 1;                 // position of '{'
  const end = findObjectEnd(raw, start);

  // Safety: the block we found must be exactly the root-level "reviews" object.
  const current = JSON.parse(raw.slice(start, end));
  if (JSON.stringify(current) !== JSON.stringify(parsed.reviews)) {
    throw new Error(`${lang}.json: found "reviews" is not the root-level block — aborting`);
  }

  const added = [];
  const merged = fillMissing(current, full, '', added);
  if (added.length === 0) { console.log(`${lang}.json: reviews already complete`); continue; }

  const block = JSON.stringify(merged, null, 2).split('\n').join(nl + lineIndent);
  const out = raw.slice(0, start) + block + raw.slice(end);
  const check = JSON.parse(out);                           // must still be valid JSON
  if (JSON.stringify(check.reviews) !== JSON.stringify(merged)) throw new Error(`${lang}.json: write verification failed`);
  writeFileSync(file, out, 'utf8');
  console.log(`${lang}.json: added ${added.length} key(s): ${added.join(', ')}`);
}
