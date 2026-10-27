/*
 * Voyager Cyber — class schedule + enrollment options (shared by pricing.html and enroll.html)
 *
 * Class dates come from the "Voyager Cyber — Website Class Schedule" Google Sheet (published
 * as CSV). If the sheet can't be reached, cohorts.csv in this repo is used instead.
 * See COHORTS.md for how to edit the sheet.
 */
(function () {
    var SCHEDULE_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9XTpBOx6Iv56S28Up7QZ7CAfcl6jWCaic17l_r4enpLKBzYaoZVr5BomF8b81FWjM5chbCj3mDExh/pub?gid=956183842&single=true&output=csv';
    var FALLBACK_CSV_URL = 'cohorts.csv';
    var DEFAULT_SCHEDULE = 'Wednesdays 7–11 PM ET · Saturdays 9 AM–12 PM ET';

    // Enrollment options. Stripe Payment Links live here and nowhere else.
    var TIERS = [
        {
            key: 'starter', group: 'individual', name: 'Starter', price: '$1,299',
            features: ['5 weeks live instruction', 'Digital course materials', 'Practice exam access'],
            checkout: 'https://buy.stripe.com/6oUeVdfaa7QOgK7dMbeIw0c'
        },
        {
            key: 'professional', group: 'individual', name: 'Professional', price: '$1,799', popular: true,
            features: ['Everything in Starter', 'Exam voucher included', 'Exam retake support included'],
            checkout: 'https://buy.stripe.com/7sYeVd2noc7465tcI7eIw0b'
        },
        {
            key: 'career', group: 'individual', name: 'Career Accelerator', price: '$2,299',
            features: ['Everything in Professional', '3x private coaching sessions ($900+ value)', 'Resume review & career plan', 'Mock interview prep'],
            checkout: 'https://buy.stripe.com/9B6eVdbXY2wufG39vVeIw0a'
        },
        {
            key: 'workforce', group: 'team', name: 'Workforce Training', price: '$1,099', per: '/ employee',
            features: ['35 hours live training', 'Course materials and practice exams'],
            checkout: 'https://book.stripe.com/cNieVd4vw4ECalJfUjeIw09'
        },
        {
            key: 'workforce-cert', group: 'team', name: 'Workforce Certification', price: '$1,599', per: '/ employee',
            features: ['35 hours live training', 'Course materials and practice exams', 'Security+ exam voucher with test retake support'],
            checkout: 'https://book.stripe.com/8x23cv8LM7QO65teQfeIw0d'
        }
    ];

    // ---- CSV ----

    function parseCsv(text) {
        var rows = [], row = [], cell = '', inQuotes = false;
        text = String(text).replace(/^﻿/, '');
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (inQuotes) {
                if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
                else if (ch === '"') inQuotes = false;
                else cell += ch;
            } else if (ch === '"') inQuotes = true;
            else if (ch === ',') { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); rows.push(row); row = []; cell = '';
            } else cell += ch;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        return rows;
    }

    function toRecords(rows) {
        var headers = (rows[0] || []).map(function (h) { return h.trim().toLowerCase(); });
        return rows.slice(1).map(function (r) {
            var rec = {};
            headers.forEach(function (h, i) { rec[h] = (r[i] || '').trim(); });
            return rec;
        }).filter(function (rec) {
            return Object.keys(rec).some(function (k) { return rec[k]; });
        });
    }

    // ---- Dates ----

    var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    function monthNum(name) { return MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1; }

    // Accepts 2027-02-03, 2/3/2027, 2/3/27, 3Feb2027, 3 Feb 2027, 3-Feb-2027, Feb 3, 2027,
    // February 3 2027. Returns {y, m, d} or null.
    function parseDay(str) {
        str = String(str).trim();
        var m, y, mo, d;
        if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(str))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
        else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(str))) { mo = +m[1]; d = +m[2]; y = +m[3]; }
        else if ((m = /^(\d{1,2})[\s-]*([A-Za-z]{3,9})\.?[\s,-]*(\d{2}|\d{4})$/.exec(str))) { d = +m[1]; mo = monthNum(m[2]); y = +m[3]; }
        else if ((m = /^([A-Za-z]{3,9})\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})$/.exec(str))) { mo = monthNum(m[1]); d = +m[2]; y = +m[3]; }
        else return null;
        if (y < 100) y += 2000;
        if (mo < 1) return null;
        var check = new Date(y, mo - 1, d);
        if (check.getFullYear() !== y || check.getMonth() !== mo - 1 || check.getDate() !== d) return null;
        return { y: y, m: mo, d: d };
    }

    function localDate(p) { return new Date(p.y, p.m - 1, p.d); }
    function isoDay(p) { return p.y + '-' + ('0' + p.m).slice(-2) + '-' + ('0' + p.d).slice(-2); }

    // 11:59:59 PM Eastern on that day, correct across daylight saving changes
    function easternEndOfDay(p) {
        for (var off = 4; off <= 5; off++) {
            var t = new Date(Date.UTC(p.y, p.m - 1, p.d, 23 + off, 59, 59));
            var hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(t);
            if (+hour === 23) return t;
        }
        return new Date(Date.UTC(p.y, p.m - 1, p.d + 1, 4, 59, 59));
    }

    function fmt(d, withYear) {
        var opts = { month: 'short', day: 'numeric' };
        if (withYear) opts.year = 'numeric';
        return d.toLocaleDateString('en-US', opts);
    }

    function fmtDeadline(c) {
        return c.enrollByDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });
    }

    function dateRange(c) {
        var sameYear = c.startDate.getFullYear() === c.endDate.getFullYear();
        return fmt(c.startDate, !sameYear) + ' – ' + fmt(c.endDate, true);
    }

    function timeLeft(c) {
        var hours = Math.floor((c.enrollByDate - Date.now()) / 3600000);
        if (hours < 48) return hours <= 1 ? 'closing now' : hours + ' hours left';
        return Math.floor(hours / 24) + ' days left';
    }

    function title(c) {
        if (c.kind === 'placeholder') return c.name || 'Next cohort';
        return (c.name ? c.name + ': ' : '') + dateRange(c);
    }

    // ---- Cohorts ----

    // Status column. Open: "Open", "Enrolling Now", "Enrollment Open"...
    // Sold out: "Sold Out", "Full". Hidden: "Hidden". Anything else counts as Coming Soon.
    function normalizeStatus(raw) {
        var s = String(raw).toLowerCase();
        if (/hid/.test(s)) return 'hidden';
        if (/sold|full|closed/.test(s)) return 'soldout';
        if (/open|enrol/.test(s)) return 'open';
        return 'comingsoon';
    }

    function buildCohorts(records) {
        var now = Date.now();
        var list = [];
        records.forEach(function (r, i) {
            var status = normalizeStatus(r['status'] || '');
            if (status === 'hidden') return;
            var c = { name: r['cohort'] || '', schedule: r['schedule'] || DEFAULT_SCHEDULE, kind: 'placeholder' };
            var start = parseDay(r['start date'] || '');
            var end = parseDay(r['end date'] || '');
            var enrollBy = parseDay(r['enroll by'] || '');
            if ((status === 'open' || status === 'soldout') && start && end && enrollBy) {
                c.kind = status;
                c.startDate = localDate(start);
                c.endDate = localDate(end);
                c.enrollByDate = easternEndOfDay(enrollBy);
                c.isoStart = isoDay(start);
                c.isoEnd = isoDay(end);
                // Optional "Class ID" column (e.g. 27-001); otherwise the start date is the ID
                c.id = (r['class id'] || c.isoStart).replace(/[^A-Za-z0-9_-]/g, '-');
                if (c.enrollByDate.getTime() <= now) return; // enrollment closed: drop it
            } else if (status === 'open' || status === 'soldout') {
                if (window.console) console.warn('Class schedule row ' + (i + 2) + ' is ' + r['status'] + ' but has a missing or unreadable date; showing it as "Dates coming soon".');
                if (!c.name) return;
            } else if (!c.name) {
                return; // a placeholder needs at least a name
            }
            list.push(c);
        });
        // Dated cohorts in start-date order, then "coming soon" placeholders in sheet order
        var dated = list.filter(function (c) { return c.kind !== 'placeholder'; })
            .sort(function (a, b) { return a.startDate - b.startDate; });
        var cohorts = dated.concat(list.filter(function (c) { return c.kind === 'placeholder'; }));
        return { cohorts: cohorts, bookable: dated.filter(function (c) { return c.kind === 'open'; }) };
    }

    function fetchCsv(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        }).then(function (text) {
            var rows = parseCsv(text);
            // Guard against a wrong link (e.g. an HTML page): the sheet must have these columns
            var headers = (rows[0] || []).map(function (h) { return h.trim().toLowerCase(); });
            if (headers.indexOf('cohort') === -1 || headers.indexOf('status') === -1) {
                throw new Error('Unexpected schedule format');
            }
            return toRecords(rows);
        });
    }

    // Resolves to { cohorts, bookable }; never rejects.
    function load() {
        return fetchCsv(SCHEDULE_CSV_URL)
            .catch(function () { return fetchCsv(FALLBACK_CSV_URL); })
            .then(buildCohorts)
            .catch(function () { return { cohorts: [], bookable: [] }; });
    }

    function tier(key) {
        for (var i = 0; i < TIERS.length; i++) if (TIERS[i].key === key) return TIERS[i];
        return null;
    }

    // The final hand-off to Stripe. client_reference_id is stored on the payment,
    // so every Stripe payment records which class it was for.
    function checkoutUrl(t, c) {
        var url = new URL(t.checkout);
        url.searchParams.set('client_reference_id', 'cohort_' + c.id);
        return url.toString();
    }

    function enrollUrl(params) {
        var q = [];
        Object.keys(params).forEach(function (k) {
            if (params[k]) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
        });
        return 'enroll.html' + (q.length ? '?' + q.join('&') : '');
    }

    window.VoyagerSchedule = {
        TIERS: TIERS,
        load: load,
        tier: tier,
        checkoutUrl: checkoutUrl,
        enrollUrl: enrollUrl,
        fmt: fmt,
        fmtDeadline: fmtDeadline,
        dateRange: dateRange,
        timeLeft: timeLeft,
        title: title,
        // exposed for testing
        _parseDay: parseDay,
        _parseCsv: parseCsv
    };
})();
