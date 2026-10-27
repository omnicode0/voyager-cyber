/*
 * Enrollment page. Step 1 (the class date) is picked on pricing.html ("Select this date"),
 * which opens enroll.html?cohort=<id>. This page handles 2. pick an option → 3. review →
 * Stripe checkout. Choices live in the URL (…&tier=…&step=…), so the browser's Back button works.
 */
(function () {
    var VS = window.VoyagerSchedule;
    var STEPS = ['date', 'option', 'review'];
    var DATES_URL = 'pricing.html#book-training';

    var panel = document.getElementById('step-panel');
    var stepsEl = document.getElementById('enroll-steps');
    var alertEl = document.getElementById('enroll-alert');
    var data = null; // { cohorts, bookable }

    // ---- helpers ----

    function el(tag, cls, text) {
        var node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function link(cls, text, href) {
        var a = el('a', cls, text);
        a.href = href;
        return a;
    }

    function button(cls, text, onClick) {
        var b = el('button', cls, text);
        b.type = 'button';
        b.addEventListener('click', onClick);
        return b;
    }

    function params() {
        var q = new URLSearchParams(window.location.search);
        return { cohort: q.get('cohort') || '', tier: q.get('tier') || '', step: q.get('step') || '' };
    }

    function findCohort(id) {
        for (var i = 0; i < data.bookable.length; i++) if (data.bookable[i].id === id) return data.bookable[i];
        return null;
    }

    function stillOpen(c) { return c && c.enrollByDate.getTime() > Date.now(); }

    function showAlert(msg) {
        alertEl.textContent = msg || '';
        alertEl.classList.toggle('d-none', !msg);
    }

    function go(next, replace) {
        var url = VS.enrollUrl(next);
        showAlert('');
        if (replace) history.replaceState(null, '', url);
        else history.pushState(null, '', url);
        render();
        var top = stepsEl.getBoundingClientRect().top + window.pageYOffset - 100;
        if (window.pageYOffset > top) window.scrollTo(0, top);
    }

    function card() {
        panel.innerHTML = '';
        var body = el('div', 'card-body p-3 p-md-4');
        panel.appendChild(body);
        return body;
    }

    function actions(body, backLabel, onBack, nextLabel, onNext, nextDisabled) {
        var bar = el('div', 'd-flex justify-content-between align-items-center gap-2 mt-3');
        bar.appendChild(onBack ? button('btn btn-outline-secondary', backLabel, onBack) : el('span'));
        var next = button('btn btn-primary px-4 fw-bold', nextLabel, onNext);
        next.disabled = !!nextDisabled;
        bar.appendChild(next);
        body.appendChild(bar);
        return next;
    }

    var optionCount = 0;
    function radioOption(name, value, checked, disabled, contentNodes, onSelect) {
        var id = 'opt-' + name + '-' + (++optionCount); // unique per element, independent of the value
        var wrap = el('label', 'cohort-option' + (disabled ? ' is-disabled' : ''));
        wrap.setAttribute('for', id);
        var input = el('input', 'form-check-input mt-1 flex-shrink-0');
        input.type = 'radio';
        input.name = name;
        input.id = id;
        input.value = value;
        input.checked = !!checked;
        input.disabled = !!disabled;
        input.addEventListener('change', function () { onSelect(value); });
        var text = el('span', 'flex-grow-1');
        contentNodes.forEach(function (n) { text.appendChild(n); });
        wrap.appendChild(input);
        wrap.appendChild(text);
        return wrap;
    }

    function setStepper(step) {
        var idx = STEPS.indexOf(step);
        Array.prototype.forEach.call(stepsEl.querySelectorAll('li'), function (li, i) {
            li.classList.toggle('is-active', i === idx);
            li.classList.toggle('is-done', i < idx);
            if (i === idx) li.setAttribute('aria-current', 'step');
            else li.removeAttribute('aria-current');
        });
    }

    // ---- step 2: option ----

    function renderOption(p, cohort) {
        var body = card();
        body.appendChild(el('h2', 'h5 fw-bold mb-1', 'Choose your option'));
        var picked = el('p', 'small text-muted mb-3', 'Class: ' + VS.title(cohort) + ' · ');
        picked.appendChild(link('small', 'Change date', DATES_URL));
        body.appendChild(picked);

        var selected = VS.tier(p.tier) ? p.tier : 'professional';
        [['individual', 'For individuals'], ['team', 'For teams & employers (3+ employees)']].forEach(function (g) {
            body.appendChild(el('h3', 'h6 text-uppercase text-muted mt-3 mb-2', g[1]));
            VS.TIERS.filter(function (t) { return t.group === g[0]; }).forEach(function (t) {
                var head = el('span', 'd-flex flex-wrap justify-content-between gap-2');
                var name = el('span', 'fw-bold', t.name + ' ');
                if (t.popular) name.appendChild(el('span', 'badge bg-primary align-middle', 'Most popular'));
                head.appendChild(name);
                head.appendChild(el('span', 'fw-bold', t.price + (t.per ? ' ' + t.per : '')));
                var feats = el('span', 'd-block small text-muted', t.features.join(' · '));
                body.appendChild(radioOption('tier', t.key, t.key === selected, false, [head, feats],
                    function (v) { selected = v; }));
            });
        });

        actions(body, 'Back', function () { window.location.href = DATES_URL; },
            'Continue', function () {
                // Remember the choice on this step's history entry so Back returns to it
                history.replaceState(null, '', VS.enrollUrl({ cohort: cohort.id, tier: selected, step: 'option' }));
                go({ cohort: cohort.id, tier: selected, step: 'review' });
            });
    }

    // ---- step 3: review ----

    function summaryRow(label, valueNodes, onChange) {
        var row = el('div', 'enroll-summary-row');
        var head = el('div', 'd-flex justify-content-between align-items-center');
        head.appendChild(el('div', 'small text-uppercase text-muted fw-bold', label));
        if (onChange) head.appendChild(button('btn btn-link btn-sm p-0 w-auto', 'Change', onChange));
        row.appendChild(head);
        valueNodes.forEach(function (n) { row.appendChild(n); });
        return row;
    }

    function renderReview(p, cohort, tier) {
        var body = card();
        body.appendChild(el('h2', 'h5 fw-bold mb-3', 'Review your enrollment'));

        body.appendChild(summaryRow('Class', [
            el('div', 'fw-bold', VS.title(cohort)),
            el('div', 'small text-muted', cohort.schedule),
            el('div', 'small', 'Enrollment closes ' + VS.fmtDeadline(cohort) + ' at 11:59 PM ET')
        ], function () { window.location.href = DATES_URL; }));

        var tierNodes = [
            el('div', 'fw-bold', tier.name + ' — ' + tier.price + (tier.per ? ' ' + tier.per : '')),
            el('div', 'small text-muted', tier.features.join(' · '))
        ];
        if (tier.group === 'team') {
            tierNodes.push(el('div', 'small', 'Enter the number of employees (3 or more) on the payment page.'));
        }
        body.appendChild(summaryRow('Option', tierNodes,
            function () { go({ cohort: cohort.id, tier: tier.key, step: 'option' }); }));

        body.appendChild(el('p', 'small text-success mt-3 mb-2',
            '✓ Flexible Enrollment Protection: full refund if you cancel 14+ days before your class starts.'));

        var terms = el('p', 'small text-muted mb-0', 'By continuing to payment, you agree to the ');
        var t1 = link('', 'Terms of Service', 'terms.html'); t1.target = '_blank'; t1.rel = 'noopener';
        var t2 = link('', 'Refund Policy', 'refund.html'); t2.target = '_blank'; t2.rel = 'noopener';
        terms.appendChild(t1);
        terms.appendChild(document.createTextNode(' and '));
        terms.appendChild(t2);
        terms.appendChild(document.createTextNode('. You’ll enter your name, email and payment details on Stripe’s secure checkout.'));
        body.appendChild(terms);

        var bar = el('div', 'd-flex justify-content-between align-items-center gap-2 mt-3');
        bar.appendChild(button('btn btn-outline-secondary', 'Back', function () {
            go({ cohort: cohort.id, tier: tier.key, step: 'option' });
        }));
        var pay = link('btn btn-primary px-4 fw-bold flex-grow-1 flex-sm-grow-0', 'Continue to Secure Payment', VS.checkoutUrl(tier, cohort));
        pay.id = 'enroll-pay';
        pay.addEventListener('click', function (e) {
            // Enrollment may have closed while the page was open
            if (!stillOpen(cohort)) {
                e.preventDefault();
                window.location.href = 'pricing.html?notice=closed#book-training';
            }
        });
        bar.appendChild(pay);
        body.appendChild(bar);
    }

    // ---- router ----

    function render() {
        var p = params();
        var cohort = findCohort(p.cohort);
        var tier = VS.tier(p.tier);

        // No valid open class chosen: the date is picked on the pricing page
        if (!cohort) {
            window.location.replace(p.cohort ? 'pricing.html?notice=closed#book-training' : DATES_URL);
            return;
        }
        var step = p.step === 'review' && tier ? 'review' : 'option';
        if (p.step && p.step !== step) {
            history.replaceState(null, '', VS.enrollUrl({ cohort: cohort.id, tier: p.tier, step: step }));
        }

        setStepper(step);
        if (step === 'option') renderOption(p, cohort);
        else renderReview(p, cohort, tier);
    }

    window.addEventListener('popstate', function () { if (data) render(); });

    VS.load().then(function (result) {
        data = result;
        render();
    });
})();
