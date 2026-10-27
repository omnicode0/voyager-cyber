/*
 * Enrollment page. Step 1 (the class date) is picked on schedule.html ("Select this date"),
 * which opens enroll.html?cohort=<id>. This page handles 2. pick an option → 3. review →
 * Stripe checkout. Choices live in the URL (…&tier=…&step=…), so the browser's Back button works.
 */
(function () {
    var VS = window.VoyagerSchedule;
    var STEPS = ['date', 'option', 'review'];
    var DATES_URL = 'schedule.html#book-training';

    var panel = document.getElementById('step-panel');
    var stepsEl = document.getElementById('enroll-steps');
    var alertEl = document.getElementById('enroll-alert');
    var data = null; // { cohorts, bookable, avail } — avail: { classId: { total, remaining } } or null

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
        return { cohort: q.get('cohort') || '', tier: q.get('tier') || '', step: q.get('step') || '', qty: q.get('qty') || '' };
    }

    function findCohort(id) {
        for (var i = 0; i < data.bookable.length; i++) if (data.bookable[i].id === id) return data.bookable[i];
        return null;
    }

    function stillOpen(c) { return c && c.enrollByDate.getTime() > Date.now(); }

    // Seats left in a class, or null if unknown (backend unreachable)
    function remaining(c) {
        var a = data.avail && data.avail[c.id];
        return a && typeof a.remaining === 'number' ? a.remaining : null;
    }

    // Why an option can't be bought for this class ('' if it can)
    function tierBlocked(t, c) {
        var left = remaining(c);
        if (t.group === 'team' && left !== null && left < VS.TEAM_MIN) {
            return 'Needs ' + VS.TEAM_MIN + '+ seats — only ' + left + ' left in this class';
        }
        return '';
    }

    function seatsNote(c) {
        var left = remaining(c);
        return left !== null && left > 0 && left < 5 ? 'Only ' + left + ' seat' + (left === 1 ? '' : 's') + ' left' : '';
    }

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
        var picked = el('p', 'small text-muted mb-3', 'Class: ' + (cohort.name ? cohort.name + ': ' : '') + VS.dateRangeWithDays(cohort) + ' · ');
        if (seatsNote(cohort)) {
            picked.appendChild(el('span', 'fw-bold text-danger', seatsNote(cohort)));
            picked.appendChild(document.createTextNode(' · '));
        }
        picked.appendChild(link('small', 'Change date', DATES_URL));
        body.appendChild(picked);

        var selected = VS.tier(p.tier) && !tierBlocked(VS.tier(p.tier), cohort) ? p.tier : 'professional';
        [['individual', 'For individuals'], ['team', 'For teams & employers (3+ employees)']].forEach(function (g) {
            body.appendChild(el('h3', 'h6 text-uppercase text-muted mt-3 mb-2', g[1]));
            VS.TIERS.filter(function (t) { return t.group === g[0]; }).forEach(function (t) {
                var head = el('span', 'd-flex flex-wrap justify-content-between gap-2');
                var name = el('span', 'fw-bold', t.name + ' ');
                if (t.popular) name.appendChild(el('span', 'badge bg-primary align-middle', 'Most popular'));
                head.appendChild(name);
                head.appendChild(el('span', 'fw-bold', t.price + (t.per ? ' ' + t.per : '')));
                var feats = el('span', 'd-block small text-muted', t.features.join(' · '));
                var nodes = [head, feats];
                var blocked = tierBlocked(t, cohort);
                if (blocked) nodes.push(el('span', 'd-block small fw-bold', blocked));
                body.appendChild(radioOption('tier', t.key, t.key === selected, !!blocked, nodes,
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

        var classNodes = [];
        if (cohort.name) classNodes.push(el('div', 'fw-bold', cohort.name));
        classNodes.push(el('div', cohort.name ? '' : 'fw-bold', 'Starts ' + VS.longDate(cohort.startDate)));
        classNodes.push(el('div', '', 'Ends ' + VS.longDate(cohort.endDate)));
        classNodes.push(el('div', 'small text-muted', cohort.schedule));
        classNodes.push(el('div', 'small', 'Enrollment closes ' + VS.longDeadline(cohort) + ' at 11:59 PM ET'));
        body.appendChild(summaryRow('Class', classNodes, function () { window.location.href = DATES_URL; }));

        var tierNodes = [
            el('div', 'fw-bold', tier.name + ' — ' + tier.price + (tier.per ? ' ' + tier.per : '')),
            el('div', 'small text-muted', tier.features.join(' · '))
        ];
        var left = remaining(cohort);
        var maxQty = Math.min(VS.TEAM_MAX, left === null ? VS.TEAM_MAX : left);
        var qtyInput = null;
        if (tier.group === 'team') {
            var qWrap = el('div', 'mt-2');
            var qLabel = el('label', 'form-label small fw-bold mb-1', 'Number of employees');
            qLabel.setAttribute('for', 'enroll-qty');
            qtyInput = el('input', 'form-control');
            qtyInput.id = 'enroll-qty';
            qtyInput.type = 'number';
            qtyInput.inputMode = 'numeric';
            qtyInput.min = String(VS.TEAM_MIN);
            qtyInput.max = String(maxQty);
            qtyInput.step = '1';
            qtyInput.style.maxWidth = '8rem';
            var startQty = parseInt(p.qty, 10);
            qtyInput.value = String(startQty >= VS.TEAM_MIN && startQty <= maxQty ? startQty : VS.TEAM_MIN);
            qWrap.appendChild(qLabel);
            qWrap.appendChild(qtyInput);
            qWrap.appendChild(el('div', 'form-text', VS.TEAM_MIN + '–' + maxQty + ' employees' +
                (left !== null && left < VS.TEAM_MAX ? ' (' + left + ' seats left in this class)' : '') + '. You’ll pay ' + tier.price + ' per employee.'));
            tierNodes.push(qWrap);
        } else if (seatsNote(cohort)) {
            tierNodes.push(el('div', 'small fw-bold text-danger', seatsNote(cohort)));
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
        var payLabel = 'Continue to Secure Payment';
        var pay = button('btn btn-primary px-4 fw-bold flex-grow-1 flex-sm-grow-0', payLabel, function () {
            // Enrollment may have closed while the page was open
            if (!stillOpen(cohort)) {
                window.location.href = 'schedule.html?notice=closed#book-training';
                return;
            }
            var qty = 1;
            if (qtyInput) {
                qty = Number(qtyInput.value);
                if (!(Math.floor(qty) === qty && qty >= VS.TEAM_MIN && qty <= maxQty)) {
                    showAlert('Please enter between ' + VS.TEAM_MIN + ' and ' + maxQty + ' employees.');
                    qtyInput.focus();
                    return;
                }
                // Keep the number in the URL so Back from Stripe restores it
                history.replaceState(null, '', VS.enrollUrl({ cohort: cohort.id, tier: tier.key, step: 'review', qty: qty }));
            }
            showAlert('');
            pay.disabled = true;
            pay.textContent = 'Opening secure checkout…';
            VS.startCheckout(cohort, tier, qty).then(function (r) {
                if (r && r.url) {
                    window.location.href = r.url;
                    return;
                }
                pay.disabled = false;
                pay.textContent = payLabel;
                if (r && (r.error === 'sold_out' || r.error === 'closed')) {
                    window.location.href = 'schedule.html?notice=' + (r.error === 'sold_out' ? 'soldout' : 'closed') + '#book-training';
                    return;
                }
                if (r && r.error === 'not_enough_seats' && typeof r.remaining === 'number') {
                    data.avail = data.avail || {};
                    data.avail[cohort.id] = { total: (data.avail[cohort.id] || {}).total, remaining: r.remaining };
                    render();
                }
                showAlert((r && r.message) || 'Something went wrong starting checkout. Please try again, or email info@voyagercyber.com.');
            });
        });
        pay.id = 'enroll-pay';
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
            window.location.replace(p.cohort ? 'schedule.html?notice=closed#book-training' : DATES_URL);
            return;
        }
        if (remaining(cohort) === 0) {
            window.location.replace('schedule.html?notice=soldout#book-training');
            return;
        }
        if (tier && tierBlocked(tier, cohort)) tier = null;
        var step = p.step === 'review' && tier ? 'review' : 'option';
        if (p.step && p.step !== step) {
            history.replaceState(null, '', VS.enrollUrl({ cohort: cohort.id, tier: tier ? tier.key : p.tier, step: step, qty: p.qty }));
        }

        setStepper(step);
        if (step === 'option') renderOption(p, cohort);
        else renderReview(p, cohort, tier);
    }

    window.addEventListener('popstate', function () { if (data) render(); });
    // Coming back from Stripe with the browser's Back button: reset the payment button
    window.addEventListener('pageshow', function (e) { if (e.persisted && data) render(); });

    Promise.all([VS.load(), VS.loadAvailability()]).then(function (results) {
        data = results[0];
        data.avail = results[1];
        render();
    });
})();
