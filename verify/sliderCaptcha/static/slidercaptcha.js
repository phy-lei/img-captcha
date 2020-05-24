

(function ($) {
  const SliderCaptcha = function (element, options) {
    this.$element = $(element);
    this.options = $.extend({}, SliderCaptcha.DEFAULTS, options);
    this.$element.css({ 'position': 'relative', 'width': this.options.width + 'px', 'margin': '0 auto' });
    // 疯了o((>ω< ))o为了密码输入失败的优化 终于找到方法 先删掉再init
    $(element).empty();
    this.init();
  };

  SliderCaptcha.VERSION = '1.0';
  SliderCaptcha.Author = 'argo@163.com';
  SliderCaptcha.DEFAULTS = {
    width: 280,     // canvas宽度
    height: 200,    // canvas高度
    PI: Math.PI,
    sliderL: 42,    // 滑块边长
    sliderR: 9,     // 滑块半径
    offset: 5,      // 容错偏差
    loadingText: '正在加载中...',
    failedText: '再试一次',
    barText: '向右滑动填充拼图',
    repeatIcon: 'fa fa-repeat',
    maxLoadCount: 3,
    localImages: function () {
        return './static/img' + Math.round(Math.random() * 4) + '.png';
    },
    verify: function (arr, url) {
      let ret = false;
      $.ajax({
        url: url,
        data: JSON.stringify(arr),
        async: false,
        cache: false,
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        success: function (result) {
          ret = result;
        }
      });
      return ret;
    },
    remoteUrl: null
  };

  function Plugin(option) {
    return this.each(function () {
      const $this = $(this);
      let data = $this.data('lgb.SliderCaptcha');
      const options = typeof option === 'object' && option;
      if(option.reboot) {
        $this.data('lgb.SliderCaptcha', data = new SliderCaptcha(this, option));
      }
      if (data && !/reset/.test(option)) return;
      if (!data) $this.data('lgb.SliderCaptcha', data = new SliderCaptcha(this, options));
      if (typeof option === 'string') data[option]();
    });
  }

  $.fn.sliderCaptcha = Plugin;
  $.fn.sliderCaptcha.Constructor = SliderCaptcha;

  const _proto = SliderCaptcha.prototype;
  _proto.init = function () {
    this.initDOM();
    this.initImg();
    this.bindEvents();
  };

  _proto.initDOM = function () {
    const createElement = function (tagName, className) {
      const elment = document.createElement(tagName);
      elment.className = className;
      return elment;
    };

    const createCanvas = function (width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    };

    const canvas = createCanvas(this.options.width - 2, this.options.height); // 画布
    const block = canvas.cloneNode(true); // 滑块
    const sliderContainer = createElement('div', 'sliderContainer');
    const refreshIcon = createElement('i', 'refreshIcon ' + this.options.repeatIcon);
    const sliderMask = createElement('div', 'sliderMask');
    const sliderbg = createElement('div', 'sliderbg');
    const slider = createElement('div', 'slider');
    const sliderIcon = createElement('i', 'fa fa-arrow-right sliderIcon');
    const text = createElement('span', 'sliderText');

    block.className = 'block';
    text.innerHTML = this.options.barText;

    const el = this.$element;
    el.append($(canvas));
    el.append($(refreshIcon));
    el.append($(block));
    slider.appendChild(sliderIcon);
    sliderMask.appendChild(slider);
    sliderContainer.appendChild(sliderbg);
    sliderContainer.appendChild(sliderMask);
    sliderContainer.appendChild(text);
    el.append($(sliderContainer));

    const _canvas = {
      canvas: canvas,
      block: block,
      sliderContainer: $(sliderContainer),
      refreshIcon: refreshIcon,
      slider: slider,
      sliderMask: sliderMask,
      sliderIcon: sliderIcon,
      text: $(text),
      canvasCtx: canvas.getContext('2d'),
      blockCtx: block.getContext('2d')
    };

    if ($.isFunction(Object.assign)) {
      Object.assign(this, _canvas);
    }
    else {
      $.extend(this, _canvas);
    }
  };

  _proto.initImg = function () {
    const that = this;
    const isIE = window.navigator.userAgent.indexOf('Trident') > -1;
    const L = this.options.sliderL + this.options.sliderR * 2 + 3; // 滑块实际边长
    const drawImg = function (ctx, operation) {
      const l = that.options.sliderL;
      const r = that.options.sliderR;
      const PI = that.options.PI;
      const x = that.x;
      const y = that.y;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x + l / 2, y - r + 2, r, 0.72 * PI, 2.26 * PI);
      ctx.lineTo(x + l, y);
      ctx.arc(x + l + r - 2, y + l / 2, r, 1.21 * PI, 2.78 * PI);
      ctx.lineTo(x + l, y + l);
      ctx.lineTo(x, y + l);
      ctx.arc(x + r - 2, y + l / 2, r + 0.4, 2.76 * PI, 1.24 * PI, true);
      ctx.lineTo(x, y);
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.stroke();
      ctx[operation]();
      ctx.globalCompositeOperation = isIE ? 'xor' : 'destination-over';
    };

    const getRandomNumberByRange = function (start, end) {
      return Math.round(Math.random() * (end - start) + start);
    };
    const img = new Image();
    img.crossOrigin = "Anonymous";
    let loadCount = 0;
    img.onload = function () {
      // 随机创建滑块的位置
      that.x = getRandomNumberByRange(L + 10, that.options.width - (L + 10));
      that.y = getRandomNumberByRange(10 + that.options.sliderR * 2, that.options.height - (L + 10));
      drawImg(that.canvasCtx, 'fill');
      drawImg(that.blockCtx, 'clip');

      that.canvasCtx.drawImage(img, 0, 0, that.options.width - 2, that.options.height);
      that.blockCtx.drawImage(img, 0, 0, that.options.width - 2, that.options.height);
      const y = that.y - that.options.sliderR * 2 - 1;
      const ImageData = that.blockCtx.getImageData(that.x - 3, y, L, L);
      that.block.width = L;
      that.blockCtx.putImageData(ImageData, 0, y + 1);
      that.text.text(that.text.attr('data-text'));
    };
    img.onerror = function () {
      loadCount++;
      if (window.location.protocol === 'file:') {
        loadCount = that.options.maxLoadCount;
        console.error("can't load pic resource file from File protocal. Please try http or https");
      }
      if (loadCount >= that.options.maxLoadCount) {
        that.text.text('加载失败').addClass('text-danger');
        return;
      }
      img.src = that.options.localImages();
    };
    img.setSrc = function () {
      let src = '';
      loadCount = 0;
      that.text.removeClass('text-danger');
      if ($.isFunction(that.options.setSrc)) src = that.options.setSrc();
      if (!src || src === '') src = 'https://picsum.photos/' + that.options.width + '/' + that.options.height + '/?image=' + Math.round(Math.random() * 20);
      if (isIE) { // IE浏览器无法通过img.crossOrigin跨域，使用ajax获取图片blob然后转为dataURL显示
        const xhr = new XMLHttpRequest();
        xhr.onloadend = function (e) {
          const file = new FileReader(); // FileReader仅支持IE10+
          file.readAsDataURL(e.target.response);
          file.onloadend = function (e) {
            img.src = e.target.result;
          };
        };
        xhr.open('GET', src);
        xhr.responseType = 'blob';
        xhr.send();
      } else img.src = src;
    };
    img.setSrc();
    this.text.attr('data-text', this.options.barText);
    this.text.text(this.options.loadingText);
    this.img = img;
    console.log(this.img);

  };

  _proto.clean = function () {
    this.canvasCtx.clearRect(0, 0, this.options.width, this.options.height);
    this.blockCtx.clearRect(0, 0, this.options.width, this.options.height);
    this.block.width = this.options.width;
  };

  _proto.bindEvents = function () {
    const that = this;
    this.$element.on('selectstart', function () {

      return false;
    });

    $(this.refreshIcon).on('click', function () {

      that.text.text(that.options.barText);
      that.reset();
      if ($.isFunction(that.options.onRefresh)) that.options.onRefresh.call(that.$element);
    });

    let originX,
      originY,
      trail = [],
      isMouseDown = false;

    const handleDragStart = function (e) {
      if (that.text.hasClass('text-danger')) return;
      originX = e.clientX || e.touches[0].clientX;
      originY = e.clientY || e.touches[0].clientY;
      isMouseDown = true;

    };

    const handleDragMove = function (e) {
      e.preventDefault();
      if (!isMouseDown) return false;
      const eventX = e.clientX || e.touches[0].clientX;
      const eventY = e.clientY || e.touches[0].clientY;
      const moveX = eventX - originX;
      const moveY = eventY - originY;
      if (moveX < 0 || moveX + 40 > that.options.width) return false;
      that.slider.style.left = (moveX - 1) + 'px';

      const blockLeft = (that.options.width - 40 - 20) / (that.options.width - 40) * moveX;
      that.block.style.left = blockLeft + 'px';

      that.sliderContainer.addClass('sliderContainer_active');
      that.sliderMask.style.width = (moveX + 4) + 'px';
      trail.push(moveY);
    };

    const handleDragEnd = function (e) {
      if (!isMouseDown) return false;
      isMouseDown = false;
      const eventX = e.clientX || e.changedTouches[0].clientX;
      if (eventX === originX) return false;
      that.sliderContainer.removeClass('sliderContainer_active');
      that.trail = trail;
      const data = that.verify();
      // 验证成功后
      if (data.spliced && data.verified) {
        that.sliderContainer.addClass('sliderContainer_success');
        // 禁掉refresh和不可以再滑动 
        that.text.addClass('text-danger success_true');
        if ($.isFunction(that.options.onSuccess)) that.options.onSuccess.call(that.$element);
      } else {
        that.sliderContainer.addClass('sliderContainer_fail');
        if ($.isFunction(that.options.onFail)) that.options.onFail.call(that.$element);
        setTimeout(function () {
          that.text.text(that.options.failedText);
          that.reset();
        }, 1000);
      }
    };

    this.slider.addEventListener('mousedown', handleDragStart);
    this.slider.addEventListener('touchstart', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);

    document.addEventListener('mousedown', function () { return false; });
    document.addEventListener('touchstart', function () { return false; });
    document.addEventListener('swipe', function () { return false; });
  };

  _proto.verify = function () {
    const arr = this.trail; // 拖动时y轴的移动距离
    const left = parseInt(this.block.style.left);
    let verified = false;
    if (this.options.remoteUrl !== null) {
      verified = this.options.verify(arr, this.options.remoteUrl);
    }
    else {
      const sum = function (x, y) { return x + y; };
      const square = function (x) { return x * x; };
      const average = arr.reduce(sum) / arr.length;
      const deviations = arr.map(function (x) { return x - average; });
      const stddev = Math.sqrt(deviations.map(square).reduce(sum) / arr.length);
      verified = stddev !== 0;
    }
    return {
      spliced: Math.abs(left - this.x) < this.options.offset,
      verified: verified
    };
  };

  _proto.reset = function () {
    if(this.text.hasClass("success_true")) return;
    this.sliderContainer.removeClass('sliderContainer_fail sliderContainer_success');
    this.slider.style.left = 0;
    this.block.style.left = 0;
    this.sliderMask.style.width = 0;
    this.clean();
    this.text.attr('data-text', this.text.text());
    this.text.text(this.options.loadingText);
    this.img.setSrc();
  };
}(jQuery));
