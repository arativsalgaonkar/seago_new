/* =====================================================================
   Seagö — Homepage v1 — interaction layer
   ===================================================================== */
(function(){
  "use strict";

  /* ---------- staggered reveal-on-scroll (with no-JS / failsafe fallback) ---------- */
  var groups = document.querySelectorAll('[data-stagger]');
  groups.forEach(function(group){
    var items = group.querySelectorAll('.reveal');
    items.forEach(function(el, i){ el.style.setProperty('--d', (i * 90) + 'ms'); });
  });

  var els = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function(el){ io.observe(el); });
  } else {
    els.forEach(function(el){ el.classList.add('in'); });
  }
  // failsafe: guarantee every section is visible even if the observer misses one
  setTimeout(function(){ els.forEach(function(el){ el.classList.add('in'); }); }, 2500);

  /* ---------- scroll progress bar + nav shadow ---------- */
  var bar = document.getElementById('progressBar');
  var nav = document.querySelector('header.nav');
  var scrollTicking = false;
  function updateScrollUi(){
    var h = document.documentElement;
    var maxScroll = h.scrollHeight - h.clientHeight;
    var pct = maxScroll > 0 ? (h.scrollTop / maxScroll) * 100 : 0;
    if(bar) bar.style.width = pct + '%';
    if(nav) nav.style.boxShadow = h.scrollTop > 12 ? '0 8px 24px -12px rgba(0,0,0,.5)' : 'none';
    scrollTicking = false;
  }
  window.addEventListener('scroll', function(){
    if(scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollUi);
  }, { passive:true });
  updateScrollUi();

  /* ---------- mobile menu ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  if(burger && menu){
    burger.addEventListener('click', function(){
      burger.classList.toggle('open');
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ burger.classList.remove('open'); menu.classList.remove('open'); });
    });
  }

  /* ---------- count-up stats ---------- */
  var counters = document.querySelectorAll('[data-count]');
  var counted = false;
  function runCount(){
    if(counted) return; counted = true;
    counters.forEach(function(el){
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var dur = 1300, t0 = null;
      function step(ts){
        if(!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if(p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  var statsWrap = document.querySelector('.hero-stats');
  if(statsWrap){
    if('IntersectionObserver' in window){
      var statsIo = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ runCount(); statsIo.disconnect(); } });
      }, { threshold: 0.4 });
      statsIo.observe(statsWrap);
    } else { runCount(); }
  }

  /* ---------- case-study image galleries ---------- */
  document.querySelectorAll('.case-gallery').forEach(function(gallery){
    var images = gallery.querySelectorAll('img');
    var current = 0;
    if(images.length < 2) return;
    setInterval(function(){
      images[current].classList.remove('is-active');
      current = (current + 1) % images.length;
      images[current].classList.add('is-active');
    }, 4000);
  });

  /* ---------- Web3Forms: Request a Quote (contact page) ---------- */
  var quoteForm = document.getElementById('quoteForm');
  if(quoteForm){
    quoteForm.addEventListener('submit', function(e){
      e.preventDefault();
      var msg = document.getElementById('formMsg');
      var btn = quoteForm.querySelector('.form-submit');
      var label = btn.querySelector('.btn-label');
      var accessKey = quoteForm.querySelector('[name="access_key"]').value;

      // Guard: the site owner must swap in a real Web3Forms access key (web3forms.com) before this goes live.
      if(!accessKey || accessKey.indexOf('YOUR_') === 0){
        msg.textContent = "This form isn't fully connected yet — a Web3Forms access key still needs to be added. Please reach us on WhatsApp or email sales@seago.in in the meantime.";
        msg.className = 'form-msg is-error';
        return;
      }

      // Honeypot: if this hidden field got filled in, silently drop the submission.
      var honeypot = quoteForm.querySelector('[name="botcheck"]');
      if(honeypot && honeypot.checked) return;

      btn.disabled = true;
      var originalLabel = label.textContent;
      label.textContent = 'Sending…';
      msg.textContent = '';
      msg.className = 'form-msg';

      var formData = new FormData(quoteForm);
      var payload = {};
      formData.forEach(function(value, key){ payload[key] = value; });

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function(res){ return res.json(); })
        .then(function(data){
          if(data && data.success){
            msg.textContent = "Thanks — we've received your request and will get back to you within one business day.";
            msg.className = 'form-msg is-success';
            quoteForm.reset();
          } else {
            msg.textContent = (data && data.message) || 'Something went wrong sending your request. Please try again or email us directly.';
            msg.className = 'form-msg is-error';
          }
        })
        .catch(function(){
          msg.textContent = 'Something went wrong sending your request. Please try again or email us directly at sales@seago.in.';
          msg.className = 'form-msg is-error';
        })
        .finally(function(){
          btn.disabled = false;
          label.textContent = originalLabel;
        });
    });

    /* Pre-select product interest from URL query params (e.g. ?product=inboard or ?motor=3HP) */
    if(window.location.search){
      var urlParams = new URLSearchParams(window.location.search);
      var productSelect = quoteForm.querySelector('[name="product_interest"]');
      var messageArea = quoteForm.querySelector('[name="message"]');
      var pParam = urlParams.get('product');
      var mParam = urlParams.get('motor');

      if(productSelect){
        if(pParam === 'outboard' || mParam){
          productSelect.value = 'Outboard Motor';
          if(mParam && messageArea && !messageArea.value){
            messageArea.value = 'Hi Seagö, I would like to request a quote for the ' + mParam + ' Electric Outboard Motor.\n\n';
          }
        } else if(pParam === 'inboard'){
          productSelect.value = 'Inboard Motor';
        } else if(pParam === 'battery'){
          productSelect.value = 'Battery Pack';
        } else if(pParam === 'boats'){
          productSelect.value = 'Electric / Solar Boat';
        } else if(pParam === 'dealer'){
          productSelect.value = 'Dealer / Distribution Enquiry';
        }
      }
    }
  }

  /* ---------- outboard motor selector ---------- */
  var motorSelector = document.querySelector('[data-motor-selector]');
  if(motorSelector){
    var motorData = {
      '3': { hp:'3 HP', model:'SE3XX', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%203HP.pdf', description:'The SEAGÖ SE3XX electric outboard motor is designed for 2 to 4 metre small vessels and uses a 48V electrical system.', specs:{'Rated Power':'2.2 kW','Rated Voltage':'48 V','Recommended Battery':'48V 50 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'Magnetic Synchronous Motor','Sensor Type':'Magnetic Encoder','Steering System':'Tiller Control','Maximum Speed':'4500 - 5000 RPM','Gear Ratio':'2.08','Transom Height':'417mm','Weight {Kg}':'13.5 Kg','Cooling System':'Air Cooled','Gear Position':'Forward'} },
      '7': { hp:'7 HP', model:'SE7 Series', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%207%20HP.pdf', description:'The SEAGÖ SE7 Series electric outboard motor is suited to 2 to 4 metre small vessels and is available with short or long tiller-control shafts.', specs:{'Rated Power':'5.1 kW','Rated Voltage':'48 V','Recommended Battery':'48V 100 AH or 48V 150 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'PMSM','Sensor Type':'Magnetic Encoder','Steering System':'Tiller Control','Maximum Speed':'5000 - 5500 RPM','Gear Ratio':'2.08','Transom Height':'S:440mm / L:568mm','Weight {Kg}':'S:30 Kg / L:31 Kg','Cooling System':'Water Cooled','Gear Position':'Forward/Neutral/ Reverse'} },
      '10': { hp:'10 HP', model:'SE10 Series', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%2010%20HP.pdf', description:'The SEAGÖ SE10 Series electric outboard motor is designed for 3.0 to 6.0 metre small vessels and supports tiller or remote control configurations.', specs:{'Rated Power':'7.3 kW','Rated Voltage':'72 V','Recommended Battery':'72V 120 AH or 72V 200 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'PMSM','Sensor Type':'Magnetic Encoder','Steering System':'Tiller / Remote Control','Maximum Speed':'4250 RPM','Gear Ratio':'2.08(27/13)','Transom Height':'S:440mm / L:567mm','Weight {Kg}':'S:37.5Kg / L: 38Kg','Cooling System':'Water Cooled','Gear Position':'Forward/Neutral/ Reverse'} },
      '15': { hp:'15 HP', model:'SE15 Series', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%2015%20HP.pdf', description:'The SEAGÖ SE15 Series electric outboard motor is suited to 3.6 to 7.0 metre small vessels and supports tiller or remote control configurations.', specs:{'Rated Power':'11 kW','Rated Voltage':'72 V','Recommended Battery':'72V 200 AH or 72V 230 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'PMSM','Sensor Type':'Magnetic Encoder','Steering System':'Tiller/Remote Control','Maximum Speed':'4650-4700 RPM','Gear Ratio':'2.08(27/13)','Transom Height':'S:440mm / L:567mm','Weight {Kg}':'S:38Kg / L:39.5Kg','Cooling System':'Water Cooled','Gear Position':'Forward/Neutral/Reverse'} },
      '20': { hp:'20 HP', model:'SE20 Series', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%2020HP.pdf', description:'The SEAGÖ SE20 Series electric outboard motor is suited to 3.6 to 7.0 metre small vessels and supports tiller or remote control configurations.', specs:{'Rated Power':'15 kW','Rated Voltage':'96 V','Recommended Battery':'96V 200 AH or 96V 230 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'PMSM','Sensor Type':'Magnetic Encoder','Steering System':'Tiller / Remote Control','Maximum Speed':'5800 RPM','Gear Ratio':'2.08','Transom Height':'S:440mm / L:570mm','Weight {Kg}':'S:45 Kg / L: 48 Kg','Cooling System':'Water Cooled','Gear Position':'Forward/Neutral/ Reverse'} },
      '30': { hp:'30 HP', model:'SE30', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%2030%20HP.pdf', description:'The SEAGÖ SE30 electric outboard motor is designed for small vessels 4 metres and above, with variable speed control and manual tilt and trim.', specs:{'Voltage / Power':'96V / 22 kW','Recommended Battery':'96V 230 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'Water cooled PMSM','Rotating Speed':'5800r/min','Max.conti. current':'230A','Max.power. consumption':'230AH','Speed control':'Infinitely variable speed','Cruise':'Available','Gear shift':'Forward / Reverse(Switch)','Cooling System':'Water Cooling','Tilt & Trim':'Manual','Propeller':'9  7/8 * 12','Power display':'Available','Recommended Stern Height':'550mm','Weight {Kg}':'52.7 Kgs'} },
      '40': { hp:'40 HP', model:'SE40AO', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%2040%20HP.pdf', description:'The SEAGÖ SE40AO electric outboard motor is designed for small vessels 4 metres and above and has an adjustable transom height.', specs:{'Rated Power':'29.4 kW','Rated Voltage':'144 V','Recommended Battery':'144V 200 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'PMSM','Sensor Type':'Magnetic Encoder','Control System':'Steering Grip - Steering Wheel  Controls','Maximum Speed':'5000-6000 RPM','Gear Ratio':'2.0','Transom Height':'508mm(max)','Weight {Kg}':'89 Kg','Cooling System':'Water Cooled','Gear Position':'Forward /Neutral / Reverse'} },
      '60': { hp:'60 HP', model:'SE60AO', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%2060%20HP.pdf', description:'The SEAGÖ SE60AO electric outboard motor is designed for small vessels 4 metres and above and has an adjustable transom height.', specs:{'Rated Power':'44.1 kW','Rated Voltage':'144 V','Recommended Battery':'144V 300 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'PMSM','Sensor Type':'Magnetic Encoder','Control System':'Steering Grip - Steering Wheel  Controls','Maximum Speed':'5000-6000 RPM','Gear Ratio':'1.8(24/13)','Transom Height':'508mm(max)','Weight {Kg}':'115 Kg','Cooling System':'Water Cooled','Gear Position':'Forward /Neutral / Reverse'} },
      '90': { hp:'90 HP', model:'SE90AO', image:'assets/photos/Outboard%20Motors.png', pdf:'tds/SEAG%C3%96%20-%2090%20HP.pdf', description:'The SEAGÖ SE90AO electric outboard motor is designed for small vessels 4 metres and above and has an adjustable transom height.', specs:{'Rated Power':'66 kW','Rated Voltage':'144 V','Recommended Battery':'144V 400 AH LiFePO4 – Lithium Ferrous Phosphate','Motor Type':'PMSM','Sensor Type':'Magnetic Encoder','Control System':'Steering Grip - Steering Wheel  Controls','Maximum Speed':'4500-5500 RPM','Gear Ratio':'1.85(24:13)','Transom Height':'508mm(max)','Weight {Kg}':'115 Kg','Cooling System':'Freshwater Closed-loop','Gear Position':'Forward /Standing /Shift'} }
    };
    var selectorRoot = motorSelector.closest('.product-row');
    var motorImage = selectorRoot.querySelector('[data-motor-image]');
    var motorHp = selectorRoot.querySelector('[data-motor-hp]');
    var motorModel = selectorRoot.querySelector('[data-motor-model]');
    var motorDescription = selectorRoot.querySelector('[data-motor-description]');
    var motorSpecs = selectorRoot.querySelector('[data-motor-specs]');
    var motorQuote = selectorRoot.querySelector('[data-motor-quote]');
    var motorPdf = selectorRoot.querySelector('[data-motor-pdf]');
    var motorInfo = selectorRoot.querySelector('.motor-product-info');
    var motorMedia = selectorRoot.querySelector('.motor-product-image');

    var currentHp = '3';

    function renderMotor(hp){
      var motor = motorData[hp];
      if(!motor) return;
      currentHp = hp;
      motorInfo.classList.add('is-changing');
      motorMedia.classList.add('is-changing');
      window.setTimeout(function(){
        motorImage.src = motor.image;
        motorImage.alt = 'Seagö ' + motor.hp + ' electric outboard motor';
        motorHp.textContent = motor.hp;
        motorModel.textContent = motor.model;
        motorDescription.textContent = motor.description;
        motorSpecs.innerHTML = '';
        Object.keys(motor.specs).forEach(function(label){
          var item = document.createElement('div');
          item.className = 'spec-item';
          var name = document.createElement('span');
          var value = document.createElement('b');
          name.textContent = label;
          value.textContent = motor.specs[label];
          item.appendChild(name);
          item.appendChild(value);
          motorSpecs.appendChild(item);
        });
        if(motorPdf && motor.pdf){
          motorPdf.href = motor.pdf;
        }
        motorQuote.href = 'contact.html?product=outboard&motor=' + encodeURIComponent(motor.hp.replace(/\s/g, ''));
        motorInfo.classList.remove('is-changing');
        motorMedia.classList.remove('is-changing');
      }, 160);
    }

    if(motorPdf){
      motorPdf.addEventListener('click', function(e){
        e.preventDefault();
        var motor = motorData[currentHp] || motorData['3'];
        if(motor && motor.pdf){
          openPdfModal('Seagö ' + motor.hp + ' Outboard — Catalog', motor.pdf);
        }
      });
    }

    motorSelector.querySelectorAll('.motor-option').forEach(function(option){
      option.addEventListener('click', function(){
        motorSelector.querySelectorAll('.motor-option').forEach(function(item){
          var active = item === option;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        renderMotor(option.getAttribute('data-hp'));
      });
    });
    var initialOption = motorSelector.querySelector('.motor-option[data-hp="3"]');
    initialOption.classList.add('active');
    initialOption.setAttribute('aria-selected', 'true');
    renderMotor('3');
  }

  /* ---------- PDF preview modal ---------- */
  var pdfModal = document.getElementById('pdfModal');
  var pdfModalTitle = document.getElementById('pdfModalTitle');
  var pdfModalFrame = document.getElementById('pdfModalFrame');
  var pdfModalNewTab = document.getElementById('pdfModalNewTab');
  var pdfModalDownload = document.getElementById('pdfModalDownload');
  var pdfModalClose = document.getElementById('pdfModalClose');
  var pdfModalBackdrop = document.getElementById('pdfModalBackdrop');

  function openPdfModal(title, pdfUrl){
    if(!pdfModal || !pdfUrl) return;
    if(pdfModalTitle) pdfModalTitle.textContent = title;
    if(pdfModalFrame) pdfModalFrame.src = pdfUrl;
    if(pdfModalNewTab) pdfModalNewTab.href = pdfUrl;
    if(pdfModalDownload){
      pdfModalDownload.href = pdfUrl;
      var filename = pdfUrl.substring(pdfUrl.lastIndexOf('/') + 1);
      pdfModalDownload.setAttribute('download', decodeURIComponent(filename));
    }
    pdfModal.classList.add('is-open');
    pdfModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closePdfModal(){
    if(!pdfModal) return;
    pdfModal.classList.remove('is-open');
    pdfModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(pdfModalFrame){
      pdfModalFrame.src = 'about:blank';
    }
  }

  if(pdfModal){
    if(pdfModalClose){
      pdfModalClose.addEventListener('click', closePdfModal);
    }
    if(pdfModalBackdrop){
      pdfModalBackdrop.addEventListener('click', closePdfModal);
    }
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && pdfModal.classList.contains('is-open')){
        closePdfModal();
      }
    });
  }

  /* ---------- desktop-only motion: magnetic buttons, hero parallax, cursor glow, card tilt ---------- */
  if(window.matchMedia('(hover:hover)').matches){

    document.querySelectorAll('.magnetic').forEach(function(btn){
      btn.addEventListener('mousemove', function(e){
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (x * 0.18) + 'px,' + (y * 0.35) + 'px)';
      });
      btn.addEventListener('mouseleave', function(){ btn.style.transform = 'translate(0,0)'; });
    });

    var hero = document.querySelector('.hero');
    var glow = document.querySelector('.cursor-glow');
    if(hero){
      var depthEls = hero.querySelectorAll('[data-depth]');
      hero.addEventListener('mousemove', function(e){
        var r = hero.getBoundingClientRect();
        var mx = (e.clientX - r.left) / r.width - 0.5, my = (e.clientY - r.top) / r.height - 0.5;
        depthEls.forEach(function(el){
          var d = parseFloat(el.getAttribute('data-depth'));
          el.style.transform = 'translate(' + (mx * d) + 'px,' + (my * d) + 'px)';
        });
        if(glow){ glow.style.left = (e.clientX - r.left) + 'px'; glow.style.top = (e.clientY - r.top) + 'px'; }
      });
    }

    document.querySelectorAll('.tilt').forEach(function(wrap){
      var card = wrap.querySelector('.card, .case-card');
      if(!card) return;
      wrap.addEventListener('mousemove', function(e){
        var r = wrap.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'translateY(-6px) rotateX(' + (py * -6) + 'deg) rotateY(' + (px * 8) + 'deg)';
      });
      wrap.addEventListener('mouseleave', function(){ card.style.transform = 'translateY(0) rotateX(0) rotateY(0)'; });
    });
  }
})();
