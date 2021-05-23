/**
 * dateUtil 날짜 간격 계산 스크립트
 *
 * 시작일, 종료일, 기준일 (standardDate) 을 기점으로 시작일과, 종료일을 출력합니다.
 *
 * @example
 *
 * var opts = {
 *     'startDate' : '#pr_start_date',
 *     'endDate' : '#pr_end_date'
 *  };
 *
 * standardDate = pr_start_date :: 선택적 .. 시적일, 종료일의 id 명
 * var sdate = dateUtil.init(options);
 *
 * @since 2011-03-11
 * @author jsyang < jsyang@simplexi.com >
 *
 */
var dateUtil = (function(){

    var $sDate, $eDate, opts = {
        'format'    : 'yyyy-mm-dd',
        'startDate' : false,
        'endDate'   : false,
        'year'      : null,
        'month'     : null,
        'day'       : null,
        'standardDate' : false
    };

    var formatLen = function(str){
        return str = (""+str).length<2 ? "0"+str : str;
    };

    var initDate = function(){
        opts.year  = null;
        opts.month = null;
        opts.day   = null;
    };

    var getLastDay = function(year, month){
        var dates = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if ((year % 4) == 0) dates[1] = 29;
        return dates[month];
    };

    var targetMonth = function(std, add) {
        std = Number(std);
        var mod = add % 12;
        var sum = std + mod;

        if (sum < 0) {
            return 12 + sum;
        } else if (sum < 12) {
            return sum;
        }

        return sum - 12;
    };

    var calDate  = function(){

        var retDate  = new Date(), $standardDate = $("#" + opts.standardDate);

        opts.year  = (opts.year  == null) ? 0 : Number(opts.year);
        opts.month = (opts.month == null) ? 0 : Number(opts.month);
        opts.day   = (opts.day   == null) ? 0 : Number(opts.day);

        if ( opts.standardDate && $("#" + opts.standardDate ).get(0) && $("#" + opts.standardDate ).val() != "" ) {

            var dt = $("#" + opts.standardDate ).val(),
                yy = Number(dt.substring( opts.format.indexOf('yyyy') , opts.format.indexOf('yyyy') + 4)),
                mm = Number(dt.substring( opts.format.indexOf('mm') , opts.format.indexOf('mm')+ 2)),
                dd = Number(dt.substring( opts.format.indexOf('dd') , opts.format.indexOf('dd')+ 2));

            retDate.setYear(yy);
            retDate.setMonth(mm -1);
            retDate.setDate(dd);
        }

        var  yy = Number(retDate.getFullYear()) + opts.year,
             mm = Number(retDate.getMonth()) + opts.month,
             dd = Number(retDate.getDate()) + opts.day;

        if (getLastDay(yy, targetMonth(retDate.getMonth(), opts.month)) < dd) {
            retDate.setYear(yy);
            retDate.setDate(getLastDay(yy, targetMonth(retDate.getMonth(), opts.month)));
            retDate.setMonth(mm);
        } else {
            retDate.setYear(yy);
            retDate.setMonth(mm);
            retDate.setDate(dd);
        }

        return dateUtil.formatDate(retDate);

    };

    return {
        init : function(o){
            opts = $.extend({}, opts, o);
            this.setInputDate(opts.startDate,opts.endDate);

            function dateDiff(){
                var sdate = opts.startDate;
                var edate = opts.endDate;

                function settings(date, num){
                    dateUtil.setInputDate(sdate,edate);
                    dateUtil.setDate(date, num);
                };

                function clear(){
                    dateUtil.setInputDate(sdate,edate);
                    dateUtil.clearDate();
                };

                return {
                    'setDate' : settings,
                    'clearDate' : clear
                };
            }

            return new dateDiff;
        },

        setDate : function(date, num){
            initDate();

            if ( ( date == 'year' || date == 'month' || date == "" || date == 'day' ) ) {
                opts[ date ]  = num;
            } else if ( date == 'betweenMonth' ) {
                this.betweenMonth(num);
                return;
            }

            if ( opts.standardDate && $("#" + opts.standardDate ).get(0) && $("#" + opts.standardDate ).val() != "" ) {
                if(  $sDate.val() == "" && $eDate.val() == ""  ) {
                    this.setDefault();
                } else {
                    if ( opts.standardDate  == $sDate.attr("id") ) {
                        $eDate.val(calDate());
                    } else if ( opts.standardDate  == $eDate.attr("id") ) {
                        $sDate.val(calDate());
                    } else {
                        this.setDefault();
                    }
                }
            } else {
                this.setDefault();
            }
        },

        getLastDay : function(year, month){
            return getLastDay(year, month);
        },

        betweenMonth : function(month, year){
            var retDate  = new Date();
            retDate.setDate(1);

            if ( month && month > 0 ) {
                retDate.setMonth(month - 1);
            }

            if ( year && year > 0 ) {
                retDate.setYear(year);
            }

            var sdate = dateUtil.formatDate(retDate);

            retDate.setDate(this.getLastDay(retDate.getFullYear(), retDate.getMonth()));
            var edate = dateUtil.formatDate(retDate);

            $sDate.val(sdate);
            $eDate.val(edate);
        },

        setDefault: function(){
            $sDate.val(calDate());
            $eDate.val(this.toDay());
        },

        setInputDate : function(ss,ee){
            $sDate = $(ss);
            $eDate = $(ee);
        },

        formatDate : function(date){
            return opts.format.replace('yyyy' , date.getFullYear()).replace('mm', formatLen(date.getMonth() + 1)).replace('dd', formatLen(date.getDate()));
        },

        toDay : function(){
            return this.formatDate(new Date());
        },

        clearDate : function(){
            $sDate.val("");
            $eDate.val("");
        }
    };

})();

var agent = navigator.userAgent.toLowerCase();
var bMobileWeb = false;

EC$(function(){

    // 모바일웹인지 확인
    if (window.location.hostname.substr(0, 2) == 'm.' ||
        window.location.hostname.substr(0, 12) == 'mobile--shop' ||
        window.location.hostname.substr(0, 11) == 'skin-mobile' ) {
        bMobileWeb = true;
    }

    // 모바일웹이 아닐경우만 포커스
    if (bMobileWeb !== true) {
        EC$('#zipcode_keyword').focus();
    }
});

var ZipcodeFinder = {};


/**
 * 부모창 객체
 */
ZipcodeFinder.Opener = {
    oLanguage: {
        apply: '',
        close: ''
    },

    /**
     * 초기화 - 이벤트 바인딩
     */
    bind : function(btnId, zipId1, zipId2, addrId, type, cityId , stateId, sLanguage, addrId2, form, sFixCountry) {
        var elmBtn = EC$('#' + btnId);
        if (elmBtn.data("btnEvent") != true) {
            var ci_name_item = "";
            // 기본 바인딩
            elmBtn.on('click', {
                'zipId1' : zipId1,
                'zipId2' : zipId2,
                'addrId' : addrId,
                'cityId' : cityId,
                'stateId' : stateId,
                'type' : type,
                'sLanguage' : sLanguage,
                'addrId2' : addrId2,
                'form' : form,
                'sFixCountry' : sFixCountry,
                oLanguage: this.oLanguage
            }, this.Event.onClickBtnPopup)
                .data("btnEvent", true);
            // 우편번호 처리
            EC$('#postcode1').attr('fw-filter', 'isLengthRange[1][14]');
            EC$('#postcode2').prop('disabled', true);
        }
    },

    /**
     * 버튼 언어셋 바인딩
     * @param oLanguage
     */
    setLanguage: function(oLanguage) {
        if (!oLanguage) {
            oLanguage = {};
        }

        for (var sKey in oLanguage) {
            if (oLanguage.hasOwnProperty(sKey) && oLanguage[sKey]) {
                this.oLanguage[sKey] = oLanguage[sKey];
            }
        }
    }
};

/**
 * 부모창 객체 - 이벤트 핸들러
 */
ZipcodeFinder.Opener.Event = {

    /**
     * 클릭 - 우편번호 팝업 오픈
     */
    onClickBtnPopup : function(evt) {

        var zipId1 = evt.data.zipId1;
        var zipId2 = evt.data.zipId2;
        var addrId = evt.data.addrId;
        var stateId = evt.data.stateId;
        var cityId = evt.data.cityId;
        var type = evt.data.type;
        var sLanguage = evt.data.sLanguage;
        var addrId2 = evt.data.addrId2;
        var form = evt.data.form;
        var sFixCountry = evt.data.sFixCountry;

        var iWidth = 308;
        var iHeigth = 340;
        var posY = "60%";
        var posX = "35%";


        if (bMobileWeb === true || type == 'mobile' || (typeof EC_MOBILE_USE !== 'undefined' && EC_MOBILE_USE == false && EC_MOBILE_DEVICE === true)) {
            var body_height = document.documentElement.clientHeight;

            var sTpl = "";
            switch (sLanguage) {
                case "ja_JP" :
                    sTpl = "zipcode_mobile_jp";
                    tmp$ = $;
                    break;
                case "zh_CN" :
                    sTpl = "zipcode_mobile_cn";
                    tmp$ = $;
                    break;
                case "zh_TW" :
                    sTpl = "zipcode_mobile_tw";
                    tmp$ = $;
                    break;
                case "vi_VN" :
                    sTpl = "zipcode_mobile_vn";
                    tmp$ = $;
                    break;
                default :
                    sTpl = "zipcode_mobile";
                    break;
            }

            var source = '<div id="zipcodeLayer" ></div>';

            EC$.get('/protected/'+sTpl+'.html?form='+form+'&zip1='+zipId1+'&zip2='+zipId2+'&addr='+addrId+'&cityId='+cityId+'&stateId='+stateId+'&type=mobile&sLanguage='+sLanguage+'&addr2='+addrId2 + '&sFixCountry='+ sFixCountry, function(data){
                // 이미 zipcodeLayer가 있으면 중복해서 append 하지 않음
                if (EC$('#zipcodeLayer').length > 0) return;
                EC$('body').append(source);
                EC$("#zipcodeLayer").html(data);
                if (sTpl == 'zipcode_mobile') {
                    EC$('body').addClass('eMobilePopup');
                } else {
                    EC$('body').attr('id', 'popup');
                }
            });

        } else if ( type == 'layer' || type == undefined ) {
            if (EC$('#zipcodeLayer').length > 0) return false;

            var sTpl = "";
            switch (sLanguage) {
                case "ja_JP" :
                    sTpl = "zipcode_layer_jp";
                    iWidth = 617;
                    iHeigth = 620;
                    var frameborder = 'frameborder="0"';
                    break;
                case "zh_CN" :
                    sTpl = "zipcode_layer_zh";
                    iWidth = 502;
                    iHeigth = 236;
                    var frameborder = 'frameborder="0"';
                    break;
                case "zh_TW" :
                    sTpl = "zipcode_layer_tw";
                    iWidth = 502;
                    iHeigth = 217;
                    var frameborder = 'frameborder="0"';
                    break;
                case "vi_VN" :
                    sTpl = "zipcode_layer_vn";
                    iWidth = 502;
                    iHeigth = 236;
                    var frameborder = 'frameborder="0"';
                    break;
                default :
                    sTpl = "zipcode_layer_kr";
                    iHeigth = 420;
                    var frameborder = 'frameborder="0"';
                    break;
            }

            var oZipOffset = EC$('#'+zipId1).offset();
            posY = oZipOffset.top - 100;
            posX = oZipOffset.left - 100;
            if (posY < 0) posY = 0;
            if (posX < 0) posX = 0;
            posY += 'px';
            posX += 'px';

            var sApplyMessage = typeof evt.data.oLanguage === 'object' ? evt.data.oLanguage.apply : '';
            var sCloseMessage = typeof evt.data.oLanguage === 'object' ? evt.data.oLanguage.close : '';
            EC$('body').append('<div id="zipcodeLayer" class="zipcodeLayer" style="position:absolute; top:'+posY+'; left:'+posX+'; width:'+iWidth+'px; height:'+iHeigth+'px; background:#fff; z-index:999;">' +
                '<iframe src="/protected/'+sTpl+'.html?form='+form+'&zip1='+zipId1+'&zip2='+zipId2+'&addr='+addrId+'&cityId='+cityId+'&stateId='+stateId+'&type=layer&sLanguage='+sLanguage+'&addr2=' + addrId2 + '&sFixCountry='+ sFixCountry + '&sApplyMessage='+ sApplyMessage + '&sCloseMessage='+ sCloseMessage +'" id="iframeZipcode" ' + frameborder + ' style="width:100%; height:100%; border:0;"></iframe>' +
                '</div>');

        } else {

            switch (sLanguage) {
                case "ja_JP" :
                    sTpl = "zipcode_jp";
                    break;
                case "zh_CN" :
                    sTpl = "zipcode_zh";
                    break;
                default : sTpl = "zipcode";
            }

            var url = '/protected/'+sTpl+'.html?zip1=' + zipId1 + '&zip2=' + zipId2 + '&addr=' + addrId;
            window.open(url, 'Zipcode', 'width=462, height=435, toolbar=0, menubar=0, scrollbars=0');

        }
    }

};


/**
 * 팝업 객체
 */
ZipcodeFinder.Popup = {

    /**
     * 초기화 - 이벤트 바인딩
     */
    bind : function(zipId1, zipId2, addrId, type,  cityId , stateId, sLanguage) {

        var elmKeyword = EC$('#zipcode_keyword');
        var elmBtnSearch = EC$('#zipcode_btn_search');
        var elmResult = EC$('#zipcode_result');
        var elmApply = EC$('#zipcode_apply');

        // 모바일웹일 경우 타켓 변경
        if ( (bMobileWeb === true || type == 'layer'  || (typeof EC_MOBILE_USE !== 'undefined' && EC_MOBILE_USE == false)) && EC_UTIL.parentWindowJquery('#zipcodeLayer').length > 0 ) {

            var elmZip1 = EC_UTIL.parentWindowJquery('#' + zipId1);
            var elmAddr = EC_UTIL.parentWindowJquery('#' + addrId);

            if ( zipId2 != '') {
                var elmZip2 = EC_UTIL.parentWindowJquery('#' + zipId2);
            } else {
                var elmZip2 = EC_UTIL.parentWindowJquery('#ice0917');
            }
            if ( cityId != '') {
                var elmCity = EC_UTIL.parentWindowJquery('#' + cityId);
            } else {
                var elmCity = EC_UTIL.parentWindowJquery('#ice0918');
            }
            if ( stateId != '') {
                var elmState = EC_UTIL.parentWindowJquery('#' + stateId);
            } else {
                var elmState = EC_UTIL.parentWindowJquery('#ice0919');
            }

        } else {
            var elmZip1 = EC_UTIL.openerWindowJquery('#' + zipId1);
            if ( zipId2 != '') { var elmZip2 = EC_UTIL.openerWindowJquery('#' + zipId2); }
            var elmAddr = EC_UTIL.openerWindowJquery('#' + addrId);
            var elmCity = EC_UTIL.topWindowJquery('#ice0918');
            var elmState = EC_UTIL.topWindowJquery('#ice0919');
        }

        elmBtnSearch.on('click', {
            'parent' : this,
            'elements' : {
                'keyword' : elmKeyword,
                'result' : elmResult,
                'zip1' : elmZip1,
                'zip2' : elmZip2,
                'addr' : elmAddr,
                'cityId' : elmCity,
                'stateId' : elmState,
                'type' : type,
                'sLanguage' : sLanguage
            }
        }, this.Event.onClickBtnSearch);

        if (EC$('div#wrap').outerHeight() !== null) {
            window.resizeTo('500', EC$('div#wrap').outerHeight() + 85);
        }
        elmKeyword.on('keyup', {
            'parent' : this,
            'elements' : {
                'keyword' : elmKeyword,
                'result' : elmResult,
                'zip1' : elmZip1,
                'zip2' : elmZip2,
                'addr' : elmAddr,
                'cityId' : elmCity,
                'stateId' : elmState,
                'type' : type,
                'sLanguage' : sLanguage
            }
        }, this.Event.onClickBtnSearch);

        // 레이어 적용 버튼
        elmApply.on('click', {
            'parent' : this,
            'elements' : {
                'keyword' : elmKeyword,
                'result' : elmResult,
                'zip1' : elmZip1,
                'zip2' : elmZip2,
                'addr' : elmAddr,
                'cityId' : elmCity,
                'stateId' : elmState,
                'type' : type,
                'sLanguage' : sLanguage
            }
        }, this.Event.onClickLayerResult);

    },

    /**
     * 성공시 출력 데이터 완성
     */
    makeSearchSuccess : function(elements, data) {

        if (elements.type == 'layer') {
            if ( elements.sLanguage == 'ja_JP') { // 일본 우편번호
                this.makeResultLayer_jp( elements, data );
            } else { // 국내 우편번호
                this.makeResultLayer(elements, data);
            }
        } else {
            this.makeResult(elements, data);
        }

    },

    /**
     * 성공시 출력 데이터 완성(Popup) - KR
     */
    makeResult : function(elements, data) {
        var count = data.length;
        var elmItem = '';

        elements.result.html('');

        for (var i=0; i < count; ++i) {

            //<tr><td>156-012</td><td>서울 동작구 신대방2동</td></tr>
            var address = '<td>' + data[i].zipcode + '</td><td>'
                + data[i].addr + ' '
                + data[i].bunji + '</td> ';

            var sAddr = (data[i].bunji.indexOf("∼") > -1) ? '' : ' '+data[i].bunji;

            elmItem = EC$('<tr addr="' + data[i].addr + sAddr + '">' + address + '</tr>').on('click', {'elements' : elements}, this.Event.onClickResult);

            elements.result.append(elmItem);
        }
    },

    /**
     * 성공시 출력 데이터 완성(Layer) - JP
     */
    makeResultLayer_jp : function(elements, data) {

        var count = data.length;
        var elmItem = '';

        elements.result.html('');

        for (var i=0; i < count; ++i) {
            var _zipcode = data[i].zipcode;
            var _addr = data[i].sido_name + ' ' + data[i].gugun_name + ' ' + data[i].dong_name;

            var address = '<td class="left">' + _addr + '</td>'
                + '<td>' + _zipcode + '</td>'
                + '<td><a href="#none" class="btnNormal"><span>Select</span></a></td>';

            elmItem = EC$('<tr addr="' + data[i].sido_name + '|' + data[i].gugun_name + '|' + data[i].dong_name + '">' + address + '</tr>').on('click', {'elements' : elements, 'zipcode' : _zipcode}, this.Event.onClickLayerResultJP);

            elements.result.append(elmItem);
        }
    },

    /**
     * 성공시 출력 데이터 완성(Layer) - KR
     */
    makeResultLayer : function(elements, data) {

        var count = data.length;
        var elmItem = '';

        elements.result.html('');

        for (var i=0; i < count; ++i) {
            //<tr><td>156-012</td><td>서울 동작구 신대방2동</td></tr>
            var address = '<td>' + data[i].zipcode + '</td><td>'
                + data[i].addr + ' '
                + data[i].bunji + '</td> ';

            var sAddr = (data[i].bunji.indexOf("∼") > -1) ? '' : ' '+data[i].bunji;

            elmItem = EC$('<tr addr="' + data[i].addr + sAddr + '">' + address + '</tr>').on('click', {'elements' : elements}, this.Event.onClickLayerResult);

            elements.result.append(elmItem);
        }
    },

    /**
     * 실패시 출력 데이터 완성
     */
    makeSearchFail : function(elements) {

        if ( elements.sLanguage != 'ko_KR') { // 일본 우편번호
            var elm = EC$('<tr><td colspan="3">No Result</td></tr>');
        } else {
            var elm = EC$('<tr><td colspan="2">우편번호 검색 내역이 없습니다.</td></tr>');
        }

        elements.result.html('');
        elements.result.append(elm);
    }

};

/**
 * 팝업 객체 - 이벤트 핸들러
 */
ZipcodeFinder.Popup.Event = {

    /**
     * 레이어 선택
     */
    onClickLayer : function() {
        EC$(this).parents().find('.selected').removeClass('selected');
        EC$(this).addClass("selected");
    },

    /**
     * 클릭 - 검색버튼
     */
    onClickBtnSearch : function(evt) {
        if ( (evt.type == 'keyup' && evt.which != 13 )) return false;//enter 로 검색

        var parent = evt.data.parent;
        var elements = evt.data.elements;

        var keyword = elements.keyword.val();
        if (keyword == '') return false;

        var url = '/exec/common/zipcode/find/';
        var params = {
            'keyword' : keyword,
            'sLanguage' : elements.sLanguage
        };

        EC$.ajax({
            type : 'post',
            url : url,
            data : params,
            success : function(response){
                if (response.result === true) {
                    parent.makeSearchSuccess(elements, response.data);
                } else {
                    parent.makeSearchFail(elements);
                }

            }
        });
    },

    /**
     * 부모창에 주소,우편번호 입력 - JP
     */
    onClickLayerResultJP : function(evt) {

        var elements = evt.data.elements;

        var zip1 = evt.data.zipcode.substr(0, 3);
        var zip2 = evt.data.zipcode.substr(4, 4);
        var aAddr = EC$(this).attr('addr').split("|",3);

        if (elements.cityId.length > 0 && elements.stateId.length > 0 ) {
            elements.cityId.val( aAddr[0] );
            elements.stateId.val( aAddr[1] );
            elements.addr.val( aAddr[2] );
        } else {
            elements.addr.val( EC$(this).attr('addr') );
        }

        if ( elements.zip2.length > 0 ) {
            elements.zip1.val(zip1);
            elements.zip2.val(zip2);
        } else {
            elements.zip1.val( zip1+'-'+zip2 );
        }

        // 해외몰 지역별배송비 부과를 위해 event발생
        try {
            if (elements.zip1.attr('id') == 'fzipcode') {
                EC_UTIL.parentWindowJquery('#' + elements.zip1.attr('id') + ', #' + elements.addr.attr('id')).blur();
            }
        } catch (e) {}

        EC_UTIL.topWindowJquery('#zipcodeLayer').remove();
    },

    /**
     * 부모창에 주소,우편번호 입력 - KR
     */
    onClickLayerResult : function(evt) {

        var elements = evt.data.elements;

        var zip1 = EC$(this).text().substr(0, 3);
        var zip2 = EC$(this).text().substr(4, 3);
        var addr = EC$(this).attr('addr');

        addr = EC_UTIL.trim(addr);
        elements.addr.val(addr);

        elements.zip1.val(zip1);
        elements.zip2.val(zip2);

        if (EC_UTIL.parentWindowJquery('.tSubmit2').offset() != undefined) EC_UTIL.parentWindowJquery('html, body').animate({scrollTop: EC_UTIL.parentWindowJquery('.tSubmit2').offset().top}, 0);

        // 국내몰 지역별 배송비 부과를 위해 event 발생
        try{
            opener.EC_SHOP_FRONT_ORDERFORM_SHIPPING.exec();

        } catch (e){}

        // 해외몰 지역별배송비 부과를 위해 event발생
        try {
            if (elements.zip1.attr('id') == 'fzipcode') {
                EC_UTIL.parentWindowJquery('#' + elements.zip1.attr('id') + ', #' + elements.addr.attr('id')).blur();
                parent.EC_SHOP_FRONT_ORDERFORM_APP_DELIVERY.exec.doAddressChange();
            }
        } catch (e) {}

        EC_UTIL.parentWindowJquery('#zipcodeLayer').remove();
    },

    /**
     * 클릭 - 검색 결과 항목
     */
    onClickResult : function(evt) {

        var elements = evt.data.elements;

        var zip1 = EC$(this).text().substr(0, 3);
        var zip2 = EC$(this).text().substr(4, 3);
        var addr = EC$(this).attr('addr');

        addr = EC_UTIL.trim(addr);

        if ( elements.zip2 != undefined ) {
            elements.zip1.val(zip1);
            elements.zip2.val(zip2);
        } else {
            elements.zip1.val( EC$(this).text() );
        }

        elements.addr.val(addr);

        // 모바일웹일 경우 레이어창 닫기
        if (agent.indexOf('iphone') != -1 || agent.indexOf('android') != -1) {
            if (window.top.document.getElementById('frm_order_act')) {//ECHOSTING-42532
                //frm_order_act는 주문서작성페이지에 있는 폼객체의 id값
                //order.html같은 페이지주소를 이용하지 않는 이유는
                //스디의 특성상 페이지주소는 사용자에 의해 변동될수있기때문에 페이지주소보다는 사용자가 파일명을 수정한다고해도
                //주문서작성페이지라면 꼭 존재하는 객체를 기준으로 잡았음
                EC_UTIL.topWindowJquery('input, a, select, button, textarea, .trigger').show();
            }
            if (EC_UTIL.topWindowJquery('.tSubmit2').offset() != undefined) EC_UTIL.topWindowJquery('html, body').animate({scrollTop: EC_UTIL.topWindowJquery('.tSubmit2').offset().top}, 0);

            // 해외몰 지역별배송비 부과를 위해 event발생
            try {
                if (elements.zip1.attr('id') == 'fzipcode') {
                    EC_UTIL.topWindowJquery('#' + elements.zip1.attr('id') + ', #' + elements.addr.attr('id')).blur();
                }
            } catch (e) {}

            EC_UTIL.topWindowJquery('#zipcodeLayer').remove();
        } else {
            window.self.close();
        }
    }
};

/**
 * 엘리먼트 종류별 값 가져오기 form 에 의한 동일한 name 값 구별
 *
 * - 오브젝트를 받아서 사용할 수 있게함.
 *
 * @param String id
 * @return
 * @author 박난하 <nhpark@simplexi.com>, 백충덕 <cdbaek@simplexi.com>, 이재욱 <jwlee03@simplexi.com>
 */
AuthSSLManager.getValue = function(id) {
    //id 가 string인 경우
    if (typeof id == 'string') {
        var divide, o, type;

        divide = id.split('::');
        if (divide.length == 1) {
            o = document.getElementsByName(id);
        } else {
            var frm = divide[0], id = divide[1];

            // radio, checkbox
            if (EC$('#'+ EC$.escapeSelector(id)).length==0) {
                val = this.checkbox({'name': id, 'mode': 'val'});
                return val;
            }
            o = document.forms[frm][id];
        }

        if ( o == null || o == undefined || o.value == null || o.value == undefined ) {
            o = document.getElementsByName(id);
            // 전체 html 에선 id 값이 있지만 form 밖에 있을수 있으므로 조건추가 (ECHOSTING-265537)
            val = (o[0] == undefined) ? '' : o[0].value;
        } else {
            val = o.value;
        }

        return val;

    } else if (typeof id == 'object') {
        //id가 object인 경우

        //오직 하나의 오브젝트에 대해서만 처리
        if (EC$(id).length == 1) {
            return EC$(id).val();
        } else {
            return '';
        }

    } else {
        // id가 string 또는 object가 아닐 경우 빈 값 리턴
        return '';
    }
};

/**
 * 엘리먼트 종류별 값 가져오기 form 에 의한 동일한 name 값 구별
 * @param String id
 * @return
 * @author 박난하 <nhpark@simplexi.com>, 백충덕 <cdbaek@simplexi.com>
 */
AuthSSLManager.getValuePay = function(id) {
    var divide, o, type;

    // id가 string이 아닐 경우 빈 값 리턴
    if (typeof id != 'string') return '';

    divide = id.split('::');
    var frm = divide[0], id = divide[1];

    // radio, checkbox
    if (EC$('#'+id).length==0) {
        val = this.checkbox({'name': id, 'mode': 'val'});
        return val;
    }

    o = document.forms[frm][id];

    if ( o == null || o == undefined || o.value == null || o.value == undefined ) {
        o = document.getElementsByName(id);
        val = o[0].value;
    } else {
        val = o.value;
    }

    return val;
};

/**
 * 암호화 param 데이터 세팅
 * @param array param 암호화 관련
 * @return string p 암호화 param
 * @author 박난하 <nhpark@simplexi.com>
 * */
AuthSSLManager.setParam = function(param) {
    var p = [];
        if (param['auth_mode'] == 'encrypt1.9') {
            p.push('auth_mode=encrypt');
        } else {
            p.push('auth_mode=' + param['auth_mode']);
        }
        p.push('auth_callbackName=' + param['auth_callbackName']);
    switch(param['auth_mode']) {
        case 'encrypt1.9':
            var aEle = param['aEleId'], o, p2 = {}, v;
            var divide = '';
            var id = '';
            for ( var i in aEle ) {
                if (aEle.hasOwnProperty(i) == false) continue;
                v = this.getValuePay(aEle[i]);

                if ( v == -1 ) continue;

                divide = aEle[i].split('::');
                id = divide[1];

                p2[id] = this.getValuePay(aEle[i]);
            }
            p.push('auth_string=' + encodeURIComponent(__JSON.stringify(p2)));
            break;
        case 'encrypt':
            var aEle = param['aEleId'], o, p2 = {}, v;
            for ( var i in aEle ) {
                if (aEle.hasOwnProperty(i) == false) continue;
                v = this.getValue(aEle[i]);

                if ( v == -1 ) continue;

                //암호화 대상이 오브젝트인경우 id값이 key가 된다.
                if (typeof aEle[i] == 'object') {
                    p2[EC$(aEle[i]).attr('id')] = this.getValue(aEle[i]);
                } else {
                    p2[aEle[i]] = this.getValue(aEle[i]);
                }
            }
            p.push('auth_string=' + encodeURIComponent(__JSON.stringify(p2)));
            break;
        case 'decrypt':
        case 'decryptClient':
            p.push('auth_string=' + encodeURIComponent(param['auth_string']));
            break;
    }

    return p;
};


/**
 * radio, checkbox 값 가져오기
 * @param object options 옵션
 * @return string radio 또는 checkbox value 반환
 * @author 박난하 <nhpark@simplexi.com>, 백충덕 <cdbaek@simplexi.com>
 * */
AuthSSLManager.checkbox = function(options)
{
    var o = document.getElementsByName(options.name);
    if ( o == null ) return;

    // element 없음
    if (o.length<1) {
        var chk = false;
        var o = document.getElementById(options.name);
        if ( o == null ) return '';
        if ( o.checked == true ) var chk = true;
        return chk == true ? o.value : '';
    }

    var bChecked = false;
    var aChk = new Array();
    for ( var i = 0; i < o.length; i++ ) {
        var el = EC$('#'+o[i].id);

        if ( el.prop('checked') == true ) {
            // RADIO
            if (el.prop('type') == 'radio') return el.val();
            // CHECKBOX
            else if (el.prop('type') == 'checkbox') {
                aChk.push(el.val());
                bChecked = true;
            }
        }
    }

    if ( options.mode == 'val' ) {
        if (bChecked == false) return '';

        if (aChk.length>0) return aChk.join('|');
    }
};






/**
 * AuthSSL을 통해 submit을 할 폼 클래스
 * @author 백충덕 <cdbaek@simplexi.com>
 * @since 2011. 6. 16
 * */
var FormSSL = function()
{
    /**
     * 폼 아이디
     * @var string
     * */
    this.sFormId = null;
    /**
     * 암호화 시킬 엘리먼트 id 배열
     * @var array
     * */
    this.aEleId  = null;

    /**
     * onsubmit bind
     * @param string sFormId bind 할 폼 아이디
     * @param array  aEleId  암호화할 엘리먼트 id 배열
     * */
    this.bind = function(sFormId, aEleId)
    {
        var self = this;

        this.sFormId = sFormId;
        this.aEleId  = aEleId;

        var oForm = EC$('#'+sFormId);
        oForm.off('submit');
        oForm.on('submit', function(){
            AuthSSL.Submit(self.sFormId, self.aEleId);

            return false;
        });
    };

    /**
     * AuthSSL submit 실행
     * */
    this.submit = function()
    {
        AuthSSL.Submit(this.sFormId, this.aEleId);
        return false;
    };
};


/**
 * AuthSSL 폼 객체 리스트 관리
 * @author 백충덕 <cdbaek@simplexi.com>
 * @since 2011. 6. 16
 * */
var FormSSLContainer = {
    /**
     * 폼 객체 리스트
     * @var object
     * */
    aFormSSL: {},

    /**
     * 폼 객체 생성 및 리스트에 추가
     * @param string sFormId 객체로 생성할 폼 아이디
     * @param array  aEleId  암호화 할 엘리먼트 아이디
     * */
    create: function (sFormId, aEleId)
    {
        if (this.formExists(sFormId)==false) {
            var oFormSSL = new FormSSL();
            oFormSSL.bind(sFormId, aEleId);
            this.aFormSSL[sFormId] = oFormSSL;
        }
    },

    /**
     * 폼 아이디로 AuthSSL submit 실행
     * @param string sFormId 폼 아이디
     * */
    submit: function (sFormId)
    {
        if (this.formExists(sFormId)==false) return;

        this.aFormSSL[sFormId].submit();
    },

    /**
     * 폼 아이디로 FormSSLContainer에 해당 폼이 있는지 체크
     * @param string sFormId 체크할 폼 아이디
     * @return bool 폼이 있으면 true, 없으면 false
     * */
    formExists: function (sFormId)
    {
        if (!this.aFormSSL[sFormId]) return false;
        else return true;
    }
};



/**
 * AuthSSL 클래스
 * @author 백충덕 <cdbaek@simplexi.com>
 * @since 2011. 6. 16
 * */
var AuthSSL = {
    /**
     * SSL on/off
     * @var bool
     * */
    bIsSsl : true,
    /**
     * 폼 아이디
     * @var string
     * */
    sFormId : null,
    /**
     * 엘리먼트 아이디
     * @var array
     * */
    aEleId : null,
    /**
     * 폼 객체 (jQuery)
     * @var object
     * */
    oFormSubmit: null,
    /**
     * 암호화 된 문자열이 저장될 input hidden id
     * @var string
     * */
    sEncryptId : 'encrypted_str',
    /**
     * callback 함수 이름
     * @var string
     * */
    sCallbackName : 'AuthSSL.encryptSubmit_Complete',

    /**
     * 멤버변수 세팅
     * @param string sFormId 폼 아이디
     * @param array  aEleId  엘리먼트 아이디
     * */
    init: function(sFormId, aEleId)
    {
        this.sFormId = sFormId;
        this.aEleId  = aEleId;
        this.oFormSubmit = EC$('#' + sFormId);
    },

    /**
     * AuthSSLManager 존재여부 체크
     * @return bool 존재하면 true, 아니면 false 반환
     * */
    checkAvailable: function()
    {
        // AuthSSLManager가 없음
        if (typeof AuthSSLManager!='object') {
            alert('[Error]\nneed SSL Manager');
            return false;
        }

        return true;
    },

    /**
     * onsubmit bind
     * @param string sFormId 폼 아이디
     * @param array  aEleId  암호화하고자 하는 필드의 id
     * */
    Bind: function(sFormId, aEleId)
    {
        FormSSLContainer.create(sFormId, aEleId);
    },

    /**
     * 암호화 요청 함수 - submit
     * @param string sFormId 폼 아이디
     * @param array  aEleId  엘리먼트 아이디
     * */
    Submit: function(sFormId, aEleId) {
        // AuthSSLManager 존재여부 체크
        if (this.checkAvailable()==false) return false;

        // 폼 아이디, 엘리먼트 아이디 세팅
        this.init(sFormId, aEleId);

        // 암호화 요청이 아닐 경우 그냥 submit
        if (this.bIsSsl == false) {
            this.disabledSslSubmit();
            return false;
        }

        // 암호화 된 값을 받을 input_hidden 생성
        var oInput = document.createElement('input');
        oInput.type = 'hidden';
        oInput.name = oInput.id = this.sEncryptId;
        this.oFormSubmit.append(oInput);

        // 암호화 요청
        this.encrypt(this.aEleId, this.sCallbackName);
    },

    /**
     * 암호화 요청
     * @param array aEleId 암호화할 엘리먼트 id
     * @param string sCallbackName 콜백함수 이름
     * */
    encrypt: function(aEleId, sCallbackName) {
        AuthSSLManager.weave({
            'auth_mode'        : 'encrypt',
            'aEleId'           : aEleId,
            'auth_callbackName': sCallbackName
        });
    },

    /**
     * 암호화 처리결과 callback 함수
     * @param string sOutput 암호화 된 처리결과
     * */
    encryptSubmit_Complete: function(sOutput) {
        // Error
        if ( AuthSSLManager.isError(sOutput) == true ) {
            alert('[Error]\n'+sOutput);
            return;
        }

        // 암호화 처리된 엘리먼트의 value 제거
        this.delInputValue();

        // input_hidden에 암호화 된 결과값 대입
        this.oFormSubmit.find('[id="'+this.sEncryptId+'"]').val(sOutput);

        // Form Submit
        this.oFormSubmit.off('submit');

        this.delInputValue();

        this.oFormSubmit.submit();
    },

    /**
     * INPUT.RADIO, INPUT.CHECKBOX의 value 지움
     * @param string sName 값을 지우고자 하는 element의 name
     * */
    delRadioValue: function(sName) {
        var oEle = document.getElementsByName(sName);
        if (oEle.length>0) {

            for (var i = 0; i < oEle.length; i++) {

                oEle[i].value = '';

                if (oEle[i].defaultValue) {

                    oEle[i].defaultValue = '';
                }
            }
        }
    },

    /**
     * 암호화 될 폼 요소들의 값을 지움
     */
    delInputValue : function() {
        for (var i=0; i<this.aEleId.length; i++) {

            // 값을 지울 element의 id 가져오기
            var sID = AuthSSL.getEleId(this.aEleId[i]);
            var oEle = this.oFormSubmit.find('[id="' + sID + '"]');

            // id를 표기하지 않고 name만 표기한 radio, checkbox
            if (oEle.length == 0) {

                this.delRadioValue(sID);
                continue;
            }

            // SELECT
            if (oEle.is('SELECT')) {

                var oSelect = oEle.children('option:selected');
                oSelect.val('');
                oSelect.prop('value', '');
                oSelect.prop('defaultValue', '');
            }
            // INPUT.TEXT, INPUT.PASSWORD, TEXTAREA
            else {

                oEle.val('');
                oEle.prop('value', '');
                oEle.prop('defaultValue', '');
            }
        } // for
    },

    /**
     * 넘겨받은 id에서 폼 아이디와 구분자를 제거하여 가져오기
     * @param string sOrgID 원본 폼 아이디
     * @return string 폼 아이디와 구분자가 제거된 아이디 반환
     * */
    getEleId: function(sOrgID)
    {
        var sID = sOrgID;
        if (/::/.test(sID)==true) {
            var aTmp = sID.split('::');
            sID = aTmp[1];
        }

        return sID;
    },

    /**
     * bIsSsl이 false 일때 실행
     */
    disabledSslSubmit : function() {
        this.oFormSubmit.off('submit');
        this.oFormSubmit.submit();
    }
};


// validator submit hook
EC$(function(){
    if (typeof FwValidator == 'undefined') return;

    FwValidator.Handler.setBeforeSubmit(function(elmForm){
        // AuthSSL 사용폼
        if (FormSSLContainer.formExists(elmForm.attr('id'))==true) {
            if (!FormSSLContainer) return true;

            FormSSLContainer.submit(elmForm.attr('id'));
            return false;
        }

        // AuthSSL 사용폼이 아닐 경우 그냥 submit
        return true;
    });
});

/**
 * 접속통계 & 실시간접속통계
 */
EC$(function(){
    // 이미 weblog.js 실행 되었을 경우 종료 
    if (EC$('#log_realtime').length > 0) {
        return;
    }
    /*
     * QueryString에서 디버그 표시 제거
     */
    function stripDebug(sLocation)
    {
        if (typeof sLocation != 'string') return '';

        sLocation = sLocation.replace(/^d[=]*[\d]*[&]*$/, '');
        sLocation = sLocation.replace(/^d[=]*[\d]*[&]/, '');
        sLocation = sLocation.replace(/(&d&|&d[=]*[\d]*[&]*)/, '&');

        return sLocation;
    }

    // 벤트 몰이 아닐 경우에만 V3(IFrame)을 로드합니다.
    // @date 190117
    // @date 191217 - 이벤트에도 V3 상시 적재로 변경.
    //if (EC_FRONT_JS_CONFIG_MANAGE.sWebLogEventFlag == "F")
    //{
    // T 일 경우 IFRAME 을 노출하지 않는다.
    if (EC_FRONT_JS_CONFIG_MANAGE.sWebLogOffFlag == "F")
    {
        if (window.self == window.top) {
            var rloc = escape(document.location);
            var rref = escape(document.referrer);
        } else {
            var rloc = (document.location).pathname;
            var rref = '';
        }

        // realconn & Ad aggregation
        var _aPrs = new Array();
        _sUserQs = window.location.search.substring(1);
        _sUserQs = stripDebug(_sUserQs);
        _aPrs[0] = 'rloc=' + rloc;
        _aPrs[1] = 'rref=' + rref;
        _aPrs[2] = 'udim=' + window.screen.width + '*' + window.screen.height;
        _aPrs[3] = 'rserv=' + aLogData.log_server2;
        _aPrs[4] = 'cid=' + eclog.getCid();
        _aPrs[5] = 'role_path=' + EC$('meta[name="path_role"]').attr('content');
        _aPrs[6] = 'stype=' + aLogData.stype;
        _aPrs[7] = 'shop_no=' + aLogData.shop_no;
        _aPrs[8] = 'lang=' + aLogData.lang;
        _aPrs[9] = 'ver=' + aLogData.ver;


        // 모바일웹일 경우 추가 파라미터 생성
        var _sMobilePrs = '';
        if (mobileWeb === true) _sMobilePrs = '&mobile=T&mobile_ver=new';

        _sUrlQs = _sUserQs + '&' + _aPrs.join('&') + _sMobilePrs;

        var _sUrlFull = '/exec/front/eclog/main/?' + _sUrlQs;

        var node = document.createElement('iframe');
        node.setAttribute('src', _sUrlFull);
        node.setAttribute('id', 'log_realtime');
        document.body.appendChild(node);

        EC$('#log_realtime').hide();
    }

    // eclog2.0, eclog1.9
    var sTime = new Date().getTime();//ECHOSTING-54575

    // 접속통계 서버값이 있다면 weblog.js 호출
    if (aLogData.log_server1 != null && aLogData.log_server1 != '') {
        var sScriptSrc = '//' + aLogData.log_server1 + '/weblog.js?uid=' + aLogData.mid + '&uname=' + aLogData.mid + '&r_ref=' + document.referrer + '&shop_no=' + aLogData.shop_no;
        if (mobileWeb === true) sScriptSrc += '&cafe_ec=mobile';
        sScriptSrc += '&t=' + sTime;//ECHOSTING-54575
        var node = document.createElement('script');
        node.setAttribute('type', 'text/javascript');
        node.setAttribute('src', sScriptSrc);
        node.setAttribute('id', 'log_script');
        document.body.appendChild(node);
    }

    // CA (Cafe24 Analytics
    if (aLogData.ca != null) {
        (function (i, s, o, g, r, a, m, n, d) {
            i['cfaObject'] = g;
            i['cfaUid'] = r;
            i['cfaStype'] = a;
            i['cfaDomain'] = m;
            i['cfaSno'] = n;
            i['cfaEtc'] = d;
            a = s.createElement(o), m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m);
        })(window, document, 'script', '//' + aLogData.ca +'?v=' + sTime, aLogData.mid, aLogData.stype, aLogData.domain, aLogData.shop_no, aLogData.etc);
    }
});

/**
 * 쇼핑몰 금액 라이브러리
 */
var SHOP_PRICE = {

    /**
     * iShopNo 쇼핑몰의 결제화폐에 맞게 리턴합니다.
     * @param float fPrice 금액
     * @param bool bIsNumberFormat number_format 적용 유무
     * @param int iShopNo 쇼핑몰번호
     * @return float|string
     */
    toShopPrice: function(fPrice, bIsNumberFormat, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        // 결제화폐 정보
        var aCurrencyInfo = SHOP_CURRENCY_INFO[iShopNo].aShopCurrencyInfo;

        return SHOP_PRICE.toPrice(fPrice, aCurrencyInfo, bIsNumberFormat);
    },

    /**
     * iShopNo 쇼핑몰의 참조화폐에 맞게 리턴합니다.
     * @param float fPrice 금액
     * @param bool bIsNumberFormat number_format 적용 유무
     * @param int iShopNo 쇼핑몰번호
     * @return float|string
     */
    toShopSubPrice: function(fPrice, bIsNumberFormat, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        // 참조화폐 정보
        var aSubCurrencyInfo = SHOP_CURRENCY_INFO[iShopNo].aShopSubCurrencyInfo;

        if ( ! aSubCurrencyInfo) {
            // 참조화폐가 없으면
            return '';

        } else {
            // 결제화폐 정보
            var aCurrencyInfo = SHOP_CURRENCY_INFO[iShopNo].aShopCurrencyInfo;
            if (aSubCurrencyInfo.currency_code === aCurrencyInfo.currency_code) {
                // 결제화폐와 참조화폐가 동일하면
                return '';
            } else {
                return SHOP_PRICE.toPrice(fPrice, aSubCurrencyInfo, bIsNumberFormat);
            }
        }
    },

    /**
     * 쇼핑몰의 기준화폐에 맞게 리턴합니다.
     * @param float fPrice 금액
     * @param bool bIsNumberFormat number_format 적용 유무
     * @param int iShopNo 쇼핑몰번호
     * @return float
     */
    toBasePrice: function(fPrice, bIsNumberFormat, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        // 기준화폐 정보
        var aBaseCurrencyInfo = SHOP_CURRENCY_INFO[iShopNo].aBaseCurrencyInfo;

        return SHOP_PRICE.toPrice(fPrice, aBaseCurrencyInfo, bIsNumberFormat);
    },

    /**
     * 결제화폐 금액을 참조화폐 금액으로 변환하여 리턴합니다.
     * @param float fPrice 금액
     * @param bool bIsNumberFormat number_format 적용 유무
     * @param int iShopNo 쇼핑몰번호
     * @return float 참조화폐 금액
     */
    shopPriceToSubPrice: function(fPrice, bIsNumberFormat, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        // 결제화폐 금액 => 참조화폐 금액
        fPrice = fPrice * (SHOP_CURRENCY_INFO[iShopNo].fExchangeSubRate || 0);

        return SHOP_PRICE.toShopSubPrice(fPrice, bIsNumberFormat, iShopNo);
    },

    /**
     * 결제화폐 대비 기준화폐 환율 리턴
     * @param int iShopNo 쇼핑몰번호
     * @return float 결제화폐 대비 기준화폐 환율
     */
    getRate: function(iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        return SHOP_CURRENCY_INFO[iShopNo].fExchangeRate;
    },

    /**
     * 결제화폐 대비 참조화폐 환율 리턴
     * @param int iShopNo 쇼핑몰번호
     * @return float 결제화폐 대비 참조화폐 환율 (참조화폐가 없는 경우 null을 리턴합니다.)
     */
    getSubRate: function(iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        return SHOP_CURRENCY_INFO[iShopNo].fExchangeSubRate;
    },

    /**
     * 금액을 원하는 화폐코드의 제약조건(소수점 절삭)에 맞춰 리턴합니다.
     * @param float fPrice 금액
     * @param string aCurrencyInfo 원하는 화폐의 화폐 정보
     * @param bool bIsNumberFormat number_format 적용 유무
     * @return float|string
     */
    toPrice: function(fPrice, aCurrencyInfo, bIsNumberFormat)
    {
        // 소수점 아래 절삭
        var iPow = Math.pow(10, aCurrencyInfo['decimal_place']);
        fPrice = fPrice * iPow;
        if (aCurrencyInfo['round_method_type'] === 'F') {
            fPrice = Math.floor(fPrice);
        } else if (aCurrencyInfo['round_method_type'] === 'C') {
            fPrice = Math.ceil(fPrice);
        } else {
            fPrice = Math.round(fPrice);
        }
        fPrice = fPrice / iPow;

        if ( ! fPrice) {
            // 가격이 없는 경우
            return 0;

        } else if (bIsNumberFormat === true) {
            // 3자리씩 ,로 끊어서 리턴
            var sPrice = fPrice.toFixed(aCurrencyInfo['decimal_place']);
            var regexp = /^(-?[0-9]+)([0-9]{3})($|\.|,)/;
            while (regexp.test(sPrice)) {
                sPrice = sPrice.replace(regexp, "$1,$2$3");
            }
            return sPrice;

        } else {
            // 숫자만 리턴
            return fPrice;

        }
    }    
};

/**
 * 화폐 포맷
 */
var SHOP_CURRENCY_FORMAT = {
    /**
     * 어드민 페이지인지
     * @var bool
     */
    _bIsAdmin: /^\/(admin\/php|disp\/admin|exec\/admin)\//.test(location.pathname) ? true : false,

    /**
     * iShopNo 쇼핑몰의 결제화폐 포맷을 리턴합니다.
     * @param int iShopNo 쇼핑몰번호
     * @return array head,tail
     */
    getShopCurrencyFormat: function(iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        // 결제화폐 코드
        var sCurrencyCode = SHOP_CURRENCY_INFO[iShopNo].aShopCurrencyInfo.currency_code;

        if (SHOP_CURRENCY_FORMAT._bIsAdmin === true) {
            // 어드민

            // 기준화폐 코드
            var sBaseCurrencyCode = SHOP_CURRENCY_INFO[iShopNo].aBaseCurrencyInfo.currency_code;

            if (sCurrencyCode === sBaseCurrencyCode) {
                // 결제화폐와 기준화폐가 동일한 경우
                return {
                    'head': '',
                    'tail': ''
                };

            } else {
                return {
                    'head': sCurrencyCode + ' ',
                    'tail': ''
                };
            }

        } else {
            // 프론트
            return SHOP_CURRENCY_INFO[iShopNo].aFrontCurrencyFormat;
        }
    },

    /**
     * iShopNo 쇼핑몰의 참조화폐의 포맷을 리턴합니다.
     * @param int iShopNo 쇼핑몰번호
     * @return array head,tail
     */
    getShopSubCurrencyFormat: function(iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        // 참조화폐 정보
        var aSubCurrencyInfo = SHOP_CURRENCY_INFO[iShopNo].aShopSubCurrencyInfo;

        if ( ! aSubCurrencyInfo) {
            // 참조화폐가 없으면
            return {
                'head': '',
                'tail': ''
            };

        } else if (SHOP_CURRENCY_FORMAT._bIsAdmin === true) {
            // 어드민
            return {
                'head': '(' + aSubCurrencyInfo.currency_code + ' ',
                'tail': ')'
            };

        } else {
            // 프론트
            return SHOP_CURRENCY_INFO[iShopNo].aFrontSubCurrencyFormat;
        }

    },

    /**
     * 쇼핑몰의 기준화폐의 포맷을 리턴합니다.
     * @param int iShopNo 쇼핑몰번호
     * @return array head,tail
     */
    getBaseCurrencyFormat: function(iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        // 기준화폐 코드
        var sBaseCurrencyCode = SHOP_CURRENCY_INFO[iShopNo].aBaseCurrencyInfo.currency_code;

        // 결제화폐 코드
        var sCurrencyCode = SHOP_CURRENCY_INFO[iShopNo].aShopCurrencyInfo.currency_code;

        if (sCurrencyCode === sBaseCurrencyCode) {
            // 기준화폐와 결제화폐가 동일하면
            return {
                'head': '',
                'tail': ''
            };

        } else {
            // 어드민
            return {
                'head': '(' + sBaseCurrencyCode + ' ',
                'tail': ')'
            };

        }
    },

    /**
     * 금액 입력란 화폐 포맷용 head,tail
     * @param int iShopNo 쇼핑몰번호
     * @return array head,tail
     */
    getInputFormat: function(iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var sCurrencyCode = SHOP_CURRENCY_INFO[iShopNo].aShopCurrencyInfo;

        // 멀티쇼핑몰이 아니고 단위가 '원화'인 경우
        if (SHOP.isMultiShop() === false && sCurrencyCode === 'KRW') {
            return {
                'head': '',
                'tail': '원'
            };

        } else {
            return {
                'head': '',
                'tail': sCurrencyCode
            };
        }
    },

    /**
     * 해당몰 결제 화폐 코드 반환
     * ECHOSTING-266141 대응
     * 국문 기본몰 일 경우에는 화폐코드가 아닌 '원' 으로 반환
     *
     * @param int iShopNo 쇼핑몰번호
     * @return string currency_code
     */
    getCurrencyCode: function(iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var sCurrencyCode = SHOP_CURRENCY_INFO[iShopNo].aShopCurrencyInfo.currency_code;

        // 멀티쇼핑몰이 아니고 단위가 '원화'인 경우
        if (SHOP.isMultiShop() === false && sCurrencyCode === 'KRW') {
            return '원';
        } else {
            return sCurrencyCode;
        }
    }

};

/**
 * 금액 포맷
 */
var SHOP_PRICE_FORMAT = {
    /**
     * iShopNo 쇼핑몰의 결제화폐에 맞도록 하고 포맷팅하여 리턴합니다.
     * @param float fPrice 금액
     * @param int iShopNo 쇼핑몰번호
     * @return string
     */
    toShopPrice: function(fPrice, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var aFormat = SHOP_CURRENCY_FORMAT.getShopCurrencyFormat(iShopNo);
        var sPrice = SHOP_PRICE.toShopPrice(fPrice, true, iShopNo);
        return aFormat.head + sPrice + aFormat.tail;
    },

    /**
     * iShopNo 쇼핑몰의 참조화폐에 맞도록 하고 포맷팅하여 리턴합니다.
     * @param float fPrice 금액
     * @param int iShopNo 쇼핑몰번호
     * @return string
     */
    toShopSubPrice: function(fPrice, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var aFormat = SHOP_CURRENCY_FORMAT.getShopSubCurrencyFormat(iShopNo);
        var sPrice = SHOP_PRICE.toShopSubPrice(fPrice, true, iShopNo);
        return aFormat.head + sPrice + aFormat.tail;
    },

    /**
     * 쇼핑몰의 기준화폐에 맞도록 하고 포맷팅하여 리턴합니다.
     * @param float fPrice 금액
     * @param int iShopNo 쇼핑몰번호
     * @return string
     */
    toBasePrice: function(fPrice, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var aFormat = SHOP_CURRENCY_FORMAT.getBaseCurrencyFormat(iShopNo);
        var sPrice = SHOP_PRICE.toBasePrice(fPrice, true, iShopNo);
        return aFormat.head + sPrice + aFormat.tail;
    },

    /**
     * 결제화폐 금액을 참조화폐 금액으로 변환하고 포맷팅하여 리턴합니다.
     * @param float fPrice 금액
     * @param int iShopNo 쇼핑몰번호
     * @return string
     */
    shopPriceToSubPrice: function(fPrice, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var aFormat = SHOP_CURRENCY_FORMAT.getShopSubCurrencyFormat(iShopNo);
        var sPrice = SHOP_PRICE.shopPriceToSubPrice(fPrice, true, iShopNo);
        return aFormat.head + sPrice + aFormat.tail;
    },
    

    /**
     * 금액을 적립금 단위 명칭 설정에 따라 반환
     * @param float fPrice 금액
     * @return float|string
     */
    toShopMileagePrice: function (fPrice, iShopNo) {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;
        
        var sPrice = SHOP_PRICE.toShopPrice(fPrice, true, iShopNo);
        if (typeof sMileageUnit != 'undefined' && EC_UTIL.trim(sMileageUnit) != '') {
            sConvertMileageUnit = sMileageUnit.replace('[:PRICE:]', sPrice);
            return sConvertMileageUnit;
        } else {
            return SHOP_PRICE_FORMAT.toShopPrice(fPrice);
        }
    },

    /**
     * 금액을 예치금 단위 명칭 설정에 따라 반환
     * @param float fPrice 금액
     * @return float|string
     */
    toShopDepositPrice: function (fPrice, iShopNo) {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;
        
        var sPrice = SHOP_PRICE.toShopPrice(fPrice, true, iShopNo);
        if (typeof sDepositUnit != 'undefined' || EC_UTIL.trim(sDepositUnit) != '') {
            return sPrice + sDepositUnit;
        } else {
            return SHOP_PRICE_FORMAT.toShopPrice(fPrice);
        }
    },

    /**
     * 금액을 부가결제수단(통합포인트) 단위 명칭 설정에 따라 반환
     * @param float fPrice 금액
     * @return float|string
     */
    toShopAddpaymentPrice: function (fPrice, sAddpaymentUnit, iShopNo) {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var sPrice = SHOP_PRICE.toShopPrice(fPrice, true, iShopNo);
        if (typeof sDepositUnit != 'undefined' || EC_UTIL.trim(sDepositUnit) != '') {
            return sPrice + sAddpaymentUnit;
        } else {
            return SHOP_PRICE_FORMAT.toShopPrice(fPrice);
        }
    },

    /**
     * 포맷을 제외한 금액정보만 리턴합니다.
     * @param {string} sFormattedPrice
     * @returns {string}
     */
    detachFormat: function(sFormattedPrice) {
        if (typeof sFormattedPrice === 'undefined' || sFormattedPrice === null) {
            return '0';
        }

        var sPattern = /[0-9.]/;
        var sPrice = '';
        for (var i = 0; i < sFormattedPrice.length; i++) {
            if (sPattern.test(sFormattedPrice[i])) {
                sPrice += sFormattedPrice[i];
            }
        }

        return sPrice;
    }
};

var SHOP_PRICE_UTIL = {
    /**
     * iShopNo 쇼핑몰의 결제화폐 금액 입력폼으로 만듭니다.
     * @param Element elem 입력폼
     * @param bool bUseMinus 마이너스 입력 사용 여부
     */
    toShopPriceInput: function(elem, iShopNo, bUseMinus)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var iDecimalPlace = SHOP_CURRENCY_INFO[iShopNo].aShopCurrencyInfo.decimal_place;
        bUseMinus ? SHOP_PRICE_UTIL._toPriceInput(elem, iDecimalPlace, bUseMinus) : SHOP_PRICE_UTIL._toPriceInput(elem, iDecimalPlace);
    },

    /**
     * iShopNo 쇼핑몰의 참조화폐 금액 입력폼으로 만듭니다.
     * @param Element elem 입력폼
     */
    toShopSubPriceInput: function(elem, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var iDecimalPlace = SHOP_CURRENCY_INFO[iShopNo].aShopSubCurrencyInfo.decimal_place;
        SHOP_PRICE_UTIL._toPriceInput(elem, iDecimalPlace);
    },

    /**
     * iShopNo 쇼핑몰의 기준화폐 금액 입력폼으로 만듭니다.
     * @param Element elem 입력폼
     */
    toBasePriceInput: function(elem, iShopNo)
    {
        iShopNo = parseInt(iShopNo) || EC_SDE_SHOP_NUM;

        var iDecimalPlace = SHOP_CURRENCY_INFO[iShopNo].aBaseCurrencyInfo.decimal_place;
        SHOP_PRICE_UTIL._toPriceInput(elem, iDecimalPlace);
    },

    /**
     * 소수점 iDecimalPlace까지만 입력 가능하도록 처리
     * @param Element elem 입력폼
     * @param int iDecimalPlace 허용 소수점
     * @param bool bUseMinus 마이너스 입력 사용 여부
     */
    _toPriceInput: function(elem, iDecimalPlace, bUseMinus)
    {
        attachEvent(elem, 'keyup', function(e) {
            e = e || window.event;
            bUseMinus ? replaceToMinusPrice(e.srcElement) : replaceToPrice(e.srcElement);
        });
        attachEvent(elem, 'blur', function(e) {
            e = e || window.event;
            bUseMinus ? replaceToMinusPrice(e.srcElement) : replaceToPrice(e.srcElement);
        });

        // 추가금액에서 마이너스를 입력받기 위해 사용
        function replaceToMinusPrice(target) {
            var value = target.value;

            var regExpTest = new RegExp('^[0-9]*' + (iDecimalPlace ? '' : '\\.[0-9]{0, ' + iDecimalPlace + '}' ) + '$');

            if (regExpTest.test(value) === false) {
                value = value.replace(/[^0-9.|\-]/g, '');
                if (parseInt(iDecimalPlace)) {
                    value = value.replace(/^([0-9]+\.[0-9]+)\.+.*$/, '$1');
                    value = value.replace(new RegExp('(\\.[0-9]{' + iDecimalPlace + '})[0-9]*$'), '$1');
                } else {
                    value = value.replace(/[^(0-9|\-)]/g, '');
                }
                target.value = value;
            }
        }

        function replaceToPrice(target)
        {
            var value = target.value;

            var regExpTest = new RegExp('^[0-9]*' + (iDecimalPlace ? '' : '\\.[0-9]{0, ' + iDecimalPlace + '}' ) + '$');
            if (regExpTest.test(value) === false) {
                value = value.replace(/[^0-9.]/g, '');
                if (parseInt(iDecimalPlace)) {
                    value = value.replace(/^([0-9]+\.[0-9]+)\.+.*$/, '$1');
                    value = value.replace(new RegExp('(\\.[0-9]{' + iDecimalPlace + '})[0-9]*$'), '$1');
                } else {
                    value = value.replace(/\.+[0-9]*$/, '');
                }
                target.value = value;
            }
        }

        function attachEvent(elem, sEventName, fn)
        {
            if ( elem.addEventListener ) {
                elem.addEventListener( sEventName, fn, false );

            } else if ( elem.attachEvent ) {
                elem.attachEvent( "on" + sEventName, fn );
            }
        }

    }
};

if (window.jQuery !== undefined) {
    $.fn.extend({
        toShopPriceInput : function(iShopNo)
        {
            return this.each(function(){
                var iElementShopNo = $(this).data('shop_no') || iShopNo;
                SHOP_PRICE_UTIL.toShopPriceInput(this, iElementShopNo);
            });
        },
        toShopSubPriceInput : function(iShopNo)
        {
            return this.each(function(){
                var iElementShopNo = $(this).data('shop_no') || iShopNo;
                SHOP_PRICE_UTIL.toShopSubPriceInput(this, iElementShopNo);
            });
        },
        toBasePriceInput : function(iShopNo)
        {
            return this.each(function(){
                var iElementShopNo = $(this).data('shop_no') || iShopNo;
                SHOP_PRICE_UTIL.toBasePriceInput(this, iElementShopNo);
            });
        }
    });
}

// EC$ 별칭용
if (typeof window.EC$ === 'function') {
    EC$.fn.extend({
        toShopPriceInput : function(iShopNo)
        {
            return this.each(function(){
                var iElementShopNo = EC$(this).data('shop_no') || iShopNo;
                SHOP_PRICE_UTIL.toShopPriceInput(this, iElementShopNo);
            });
        },
        toShopSubPriceInput : function(iShopNo)
        {
            return this.each(function(){
                var iElementShopNo = EC$(this).data('shop_no') || iShopNo;
                SHOP_PRICE_UTIL.toShopSubPriceInput(this, iElementShopNo);
            });
        },
        toBasePriceInput : function(iShopNo)
        {
            return this.each(function(){
                var iElementShopNo = EC$(this).data('shop_no') || iShopNo;
                SHOP_PRICE_UTIL.toBasePriceInput(this, iElementShopNo);
            });
        }
    });
}

(function(window){
    window.htmlentities = {
        /**
         * Converts a string to its html characters completely.
         *
         * @param {String} str String with unescaped HTML characters
         **/
        encode : function(str) {
            var buf = [];

            for (var i=str.length-1; i>=0; i--) {
                buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
            }

            return buf.join('');
        },
        /**
         * Converts an html characterSet into its original character.
         *
         * @param {String} str htmlSet entities
         **/
        decode : function(str) {
            return str.replace(/&#(\d+);/g, function(match, dec) {
                return String.fromCharCode(dec);
            });
        }
    };
})(window);
/**
 * 비동기식 데이터
 */
var CAPP_ASYNC_METHODS = {
    DEBUG: false,
    IS_LOGIN: (document.cookie.match(/(?:^| |;)iscache=F/) ? true : false),
    EC_PATH_ROLE: EC$('meta[name="path_role"]').attr('content') || '',
    aDatasetList: [],
    $xansMyshopMain: EC$('.xans-myshop-main'),
    init : function()
    {
    	var bDebug = CAPP_ASYNC_METHODS.DEBUG;

        var aUseModules = [];
        var aNoCachedModules = [];

        EC$(CAPP_ASYNC_METHODS.aDatasetList).each(function(){
            var sKey = this;

            var oTarget = CAPP_ASYNC_METHODS[sKey];

            if (bDebug) {
                console.log(sKey);
            }
            var bIsUse = oTarget.isUse();
            if (bDebug) {
                console.log('   isUse() : ' + bIsUse);
            }

            if (bIsUse === true) {
                aUseModules.push(sKey);

                if (oTarget.restoreCache === undefined || oTarget.restoreCache() === false) {
                    if (bDebug) {
                        console.log('   restoreCache() : true');
                    }
                    aNoCachedModules.push(sKey);
                }
            }
        });

        if (aNoCachedModules.length > 0) {
            var sEditor = '';
            try {
                if (bEditor === true) {
                    // 에디터에서 접근했을 경우 임의의 상품 지정
                    sEditor = '&PREVIEW_SDE=1';
                }
            } catch(e) { }

            var sPathRole = '&path_role=' + CAPP_ASYNC_METHODS.EC_PATH_ROLE;

            EC$.ajax(
            {
                url : '/exec/front/manage/async?module=' + aNoCachedModules.join(',') + sEditor + sPathRole,
                dataType : 'json',
                success : function(aData)
                {
                	CAPP_ASYNC_METHODS.setData(aData, aUseModules);
                }
            });

        } else {
        	CAPP_ASYNC_METHODS.setData({}, aUseModules);

        }
    },
    setData : function(aData, aUseModules)
    {
        aData = aData || {};

        EC$(aUseModules).each(function(){
            var sKey = this;

            var oTarget = CAPP_ASYNC_METHODS[sKey];

            if (oTarget.setData !== undefined && aData.hasOwnProperty(sKey) === true) {
                oTarget.setData(aData[sKey]);
            }

            if (oTarget.execute !== undefined) {
                oTarget.execute();
            }
        });
    },

    _getCookie: function(sCookieName)
    {
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        return aCookieValue ? aCookieValue[1] : null;
    }
};
/**
 * 비동기식 데이터 - 회원 정보
 */
CAPP_ASYNC_METHODS.aDatasetList.push('member');
CAPP_ASYNC_METHODS.member = {
    __sEncryptedString: null,
    __isAdult: 'F',

    // 회원 데이터
    __sMemberId: null,
    __sName: null,
    __sNickName: null,
    __sGroupName: null,
    __sEmail: null,
    __sPhone: null,
    __sCellphone: null,
    __sBirthday: null,
    __sGroupNo: null,
    __sBoardWriteName: null,
    __sAdditionalInformation: null,
    __sCreatedDate: null,

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (EC$('.xans-layout-statelogon, .xans-layout-logon').length > 0) {
                return true;
            }

            if (CAPP_ASYNC_METHODS.recent.isUse() === true
                && typeof(EC_FRONT_JS_CONFIG_SHOP) !== 'undefined'
                && EC_FRONT_JS_CONFIG_SHOP.adult19Warning === 'T') {
                return true;
            }

            if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('customer', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
                return true;
            }

        } else {
            // 비 로그인 상태에서 삭제처리
            this.removeCache();
        }

        return false;
    },

    restoreCache: function()
    {
        // sessionStorage 지원 여부 확인
        if (!window.sessionStorage) {
            return false;
        }

        // 데이터 복구 유무
        var bRestored = false;

        try {
            // 데이터 복구
            var oCache = JSON.parse(window.sessionStorage.getItem('member_' + EC_SDE_SHOP_NUM));

            // expire 체크
            if (oCache.exp < Date.now()) {
                throw 'cache has expired.';
            }

            // 데이터 체크
            if (typeof oCache.data.member_id === 'undefined'
                || oCache.data.member_id === ''
                || typeof oCache.data.name === 'undefined'
                || typeof oCache.data.nick_name === 'undefined'
                || typeof oCache.data.group_name === 'undefined'
                || typeof oCache.data.group_no === 'undefined'
                || typeof oCache.data.email === 'undefined'
                || typeof oCache.data.phone === 'undefined'
                || typeof oCache.data.cellphone === 'undefined'
                || typeof oCache.data.birthday === 'undefined'
                || typeof oCache.data.board_write_name === 'undefined'
                || typeof oCache.data.additional_information === 'undefined'
                || typeof oCache.data.created_date === 'undefined'
            ) {
                throw 'Invalid cache data.';
            }

            // 데이터 복구
            this.__sMemberId = oCache.data.member_id;
            this.__sName = oCache.data.name;
            this.__sNickName = oCache.data.nick_name;
            this.__sGroupName = oCache.data.group_name;
            this.__sGroupNo   = oCache.data.group_no;
            this.__sEmail = oCache.data.email;
            this.__sPhone = oCache.data.phone;
            this.__sCellphone = oCache.data.cellphone;
            this.__sBirthday = oCache.data.birthday;
            this.__sBoardWriteName = oCache.data.board_write_name;
            this.__sAdditionalInformation = oCache.data.additional_information;
            this.__sCreatedDate = oCache.data.created_date;

            bRestored = true;
        } catch(e) {
            // 복구 실패시 캐시 삭제
            this.removeCache();
        }

        return bRestored;
    },

    cache: function()
    {
        // sessionStorage 지원 여부 확인
        if (!window.sessionStorage) {
            return;
        }

        // 캐시
        window.sessionStorage.setItem('member_' + EC_SDE_SHOP_NUM, JSON.stringify({
            exp: Date.now() + (1000 * 60 * 10),
            data: this.getData()
        }));
    },

    removeCache: function()
    {
        // sessionStorage 지원 여부 확인
        if (!window.sessionStorage) {
            return;
        }

        // 캐시 삭제
        window.sessionStorage.removeItem('member_' + EC_SDE_SHOP_NUM);
    },

    setData: function(oData)
    {
        this.__sEncryptedString = oData.memberData;
        this.__isAdult = oData.memberIsAdult;
    },

    execute: function()
    {
        if (this.__sMemberId === null) {
            AuthSSLManager.weave({
                'auth_mode'          : 'decryptClient',
                'auth_string'        : this.__sEncryptedString,
                'auth_callbackName'  : 'CAPP_ASYNC_METHODS.member.setDataCallback'
            });
        } else {
            this.render();
        }
    },

    setDataCallback: function(sData)
    {
        try {
            var sDecodedData = decodeURIComponent(sData);

            if (AuthSSLManager.isError(sDecodedData) == true) {
                console.log(sDecodedData);
                return;
            }

            var oData = AuthSSLManager.unserialize(sDecodedData);
            this.__sMemberId = oData.id || '';
            this.__sName = oData.name || '';
            this.__sNickName = oData.nick || '';
            this.__sGroupName = oData.group_name || '';
            this.__sGroupNo   = oData.group_no || '';
            this.__sEmail = oData.email || '';
            this.__sPhone = oData.phone || '';
            this.__sCellphone = oData.cellphone || '';
            this.__sBirthday = oData.birthday || 'F';
            this.__sBoardWriteName = oData.board_write_name || '';
            this.__sAdditionalInformation = oData.additional_information || '';
            this.__sCreatedDate = oData.created_date || '';

            // 데이터 랜더링
            this.render();

            // 데이터 캐시
            this.cache();
        } catch(e) {}
    },

    render: function()
    {
        // 친구초대
        if (EC$('.xans-myshop-asyncbenefit').length > 0) {
            EC$('#reco_url').attr({value: EC$('#reco_url').val() + this.__sMemberId});
        }

        EC$('.authssl_member_name').html(this.__sName);
        EC$('.xans-member-var-id').html(this.__sMemberId);
        EC$('.xans-member-var-name').html(this.__sName);
        EC$('.xans-member-var-nick').html(this.__sNickName);
        EC$('.xans-member-var-group_name').html(this.__sGroupName);
        EC$('.xans-member-var-group_no').html(this.__sGroupNo);
        EC$('.xans-member-var-email').html(this.__sEmail);
        EC$('.xans-member-var-phone').html(this.__sPhone);

        if (EC$('.xans-board-commentwrite').length > 0 && typeof BOARD_COMMENT !== 'undefined') {
            BOARD_COMMENT.setCmtData();
        }
    },

    getMemberIsAdult: function()
    {
        return this.__isAdult;
    },

    getData: function()
    {
        return {
            member_id: this.__sMemberId,
            name: this.__sName,
            nick_name: this.__sNickName,
            group_name: this.__sGroupName,
            group_no: this.__sGroupNo,
            email: this.__sEmail,
            phone: this.__sPhone,
            cellphone: this.__sCellphone,
            birthday: this.__sBirthday,
            board_write_name: this.__sBoardWriteName,
            additional_information: this.__sAdditionalInformation,
            created_date: this.__sCreatedDate
        };
    }
};
/**
 * 비동기식 데이터 - 예치금
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Ordercnt');
CAPP_ASYNC_METHODS.Ordercnt = {
    __iOrderShppiedBeforeCount: null,
    __iOrderShppiedStandbyCount: null,
    __iOrderShppiedBeginCount: null,
    __iOrderShppiedComplateCount: null,
    __iOrderShppiedCancelCount: null,
    __iOrderShppiedExchangeCount: null,
    __iOrderShppiedReturnCount: null,

    __$target: EC$('#xans_myshop_orderstate_shppied_before_count'),
    __$target2: EC$('#xans_myshop_orderstate_shppied_standby_count'),
    __$target3: EC$('#xans_myshop_orderstate_shppied_begin_count'),
    __$target4: EC$('#xans_myshop_orderstate_shppied_complate_count'),
    __$target5: EC$('#xans_myshop_orderstate_order_cancel_count'),
    __$target6: EC$('#xans_myshop_orderstate_order_exchange_count'),
    __$target7: EC$('#xans_myshop_orderstate_order_return_count'),

    isUse: function()
    {
        if (EC$('.xans-myshop-orderstate').length > 0) {
            return true; 
        }

        return false;
    },

    restoreCache: function()
    {
        var sCookieName = 'ordercnt_' + EC_SDE_SHOP_NUM;
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            var aData = EC_UTIL.parseJSON(decodeURIComponent(aCookieValue[1]));
            this.__iOrderShppiedBeforeCount = aData.shipped_before_count;
            this.__iOrderShppiedStandbyCount = aData.shipped_standby_count;
            this.__iOrderShppiedBeginCount = aData.shipped_begin_count;
            this.__iOrderShppiedComplateCount = aData.shipped_complate_count;
            this.__iOrderShppiedCancelCount = aData.order_cancel_count;
            this.__iOrderShppiedExchangeCount = aData.order_exchange_count;
            this.__iOrderShppiedReturnCount = aData.order_return_count;
            return true;
        }

        return false;
    },

    setData: function(aData)
    {
        this.__iOrderShppiedBeforeCount = aData['shipped_before_count'];
        this.__iOrderShppiedStandbyCount = aData['shipped_standby_count'];
        this.__iOrderShppiedBeginCount = aData['shipped_begin_count'];
        this.__iOrderShppiedComplateCount = aData['shipped_complate_count'];
        this.__iOrderShppiedCancelCount = aData['order_cancel_count'];
        this.__iOrderShppiedExchangeCount = aData['order_exchange_count'];
        this.__iOrderShppiedReturnCount = aData['order_return_count'];
    },

    execute: function()
    {
        this.__$target.html(this.__iOrderShppiedBeforeCount);
        this.__$target2.html(this.__iOrderShppiedStandbyCount);
        this.__$target3.html(this.__iOrderShppiedBeginCount);
        this.__$target4.html(this.__iOrderShppiedComplateCount);
        this.__$target5.html(this.__iOrderShppiedCancelCount);
        this.__$target6.html(this.__iOrderShppiedExchangeCount);
        this.__$target7.html(this.__iOrderShppiedReturnCount);
    },

    getData: function()
    {
        return {
            shipped_before_count: this.__iOrderShppiedBeforeCount,
            shipped_standby_count: this.__iOrderShppiedStandbyCount,
            shipped_begin_count: this.__iOrderShppiedBeginCount,
            shipped_complate_count: this.__iOrderShppiedComplateCount,
            order_cancel_count: this.__iOrderShppiedCancelCount,
            order_exchange_count: this.__iOrderShppiedExchangeCount,
            order_return_count: this.__iOrderShppiedReturnCount
        };
    }
};
/**
 * 비동기식 데이터 - 장바구니 갯수
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Basketcnt');
CAPP_ASYNC_METHODS.Basketcnt = {
    __iBasketCount: null,

    __$target: EC$('.xans-layout-orderbasketcount span a'),
    __$target2: EC$('#xans_myshop_basket_cnt'),
    __$target3: CAPP_ASYNC_METHODS.$xansMyshopMain.find('.xans_myshop_main_basket_cnt'),
    __$target4: EC$('.EC-Layout-Basket-count'),

    isUse: function()
    {
        if (this.__$target.length > 0) {
            return true;
        }
        if (this.__$target2.length > 0) {
            return true;
        }
        if (this.__$target3.length > 0) {
            return true;
        }
        if (this.__$target4.length > 0) {
            return true;
        }

        if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('personal', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
            return true;
        }

        return false;
    },

    restoreCache: function()
    {
        var sCookieName = 'basketcount_' + EC_SDE_SHOP_NUM;
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            this.__iBasketCount = parseInt(aCookieValue[1], 10);
            return true;
        }
        
        return false;
    },

    setData: function(sData)
    {
        this.__iBasketCount = Number(sData);
    },

    execute: function()
    {
        this.__$target.html(this.__iBasketCount);

        if (SHOP.getLanguage() === 'ko_KR') {
            this.__$target2.html(this.__iBasketCount + '개');
        } else {
            this.__$target2.html(this.__iBasketCount);
        }

        this.__$target3.html(this.__iBasketCount);
        
        this.__$target4.html(this.__iBasketCount);
        
        if (this.__iBasketCount > 0 && this.__$target4.length > 0) {
            var $oCountDisplay = EC$('.EC-Layout_Basket-count-display');

            if ($oCountDisplay.length > 0) {
                $oCountDisplay.removeClass('displaynone');
            }
        }
    },

    getData: function()
    {
        return {
            count: this.__iBasketCount
        };
    }
};
/**
 * 비동기식 데이터 - 장바구니 금액
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Basketprice');
CAPP_ASYNC_METHODS.Basketprice = {
    __sBasketPrice: null,

    __$target: EC$('#xans_myshop_basket_price'),

    isUse: function()
    {
        if (this.__$target.length > 0) {
            return true;
        }

        if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('personal', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
            return true;
        }

        return false;
    },

    restoreCache: function()
    {
        var sCookieName = 'basketprice_' + EC_SDE_SHOP_NUM;
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            this.__sBasketPrice = decodeURIComponent((aCookieValue[1]+ '').replace(/\+/g, '%20'));
            return true;
        }
        
        return false;
    },

    setData: function(sData)
    {
        this.__sBasketPrice = sData;
    },

    execute: function()
    {
        this.__$target.html(this.__sBasketPrice);
    },

    getData: function()
    {
        // 데이터 없는경우 0
        var sBasketPrice = (this.__sBasketPrice || 0) + '';

        return {
            basket_price: parseFloat(SHOP_PRICE_FORMAT.detachFormat(htmlentities.decode(sBasketPrice))).toFixed(2)
        };
    }
};
/*
 * 비동기식 데이터 - 장바구니 상품리스트
 */
CAPP_ASYNC_METHODS.aDatasetList.push('BasketProduct');
CAPP_ASYNC_METHODS.BasketProduct = {

    STORAGE_KEY: 'BasketProduct_' +  EC_SDE_SHOP_NUM,

    __aData: null,

    __$target: EC$('.xans-layout-orderbasketcount span a'),
    __$target2: EC$('#xans_myshop_basket_cnt'),
    __$target3: CAPP_ASYNC_METHODS.$xansMyshopMain.find('.xans_myshop_main_basket_cnt'),
    __$target4: EC$('.EC-Layout-Basket-count'),

    isUse: function()
    {
        if (this.__$target.length > 0) {
            return true;
        }
        if (this.__$target2.length > 0) {
            return true;
        }
        if (this.__$target3.length > 0) {
            return true;
        }
        if (this.__$target4.length > 0) {
            return true;
        }

        if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('personal', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
            return true;
        }
    },

    restoreCache: function()
    {
        // sessionStorage 지원 여부 확인
        if (!window.sessionStorage) {
            return false;
        }

        var sSessionStorageData = window.sessionStorage.getItem(this.STORAGE_KEY);
        if (sSessionStorageData === null) {
            return false;
        }

        try {
            this.__aData = [];
            var aStorageData = JSON.parse(sSessionStorageData);

            for (var iKey in aStorageData) {
                this.__aData.push(aStorageData[iKey]);
            }

            return true;
        } catch(e) {

            // 복구 실패시 캐시 삭제
            this.removeCache();

            return false;
        }
    },

    removeCache: function()
    {
        // sessionStorage 지원 여부 확인
        if (!window.sessionStorage) {
            return;
        }
        // 캐시 삭제
        window.sessionStorage.removeItem(this.STORAGE_KEY);
    },

    setData: function(oData)
    {
        this.__aData = oData;

        // sessionStorage 지원 여부 확인
        if (!window.sessionStorage) {
            return;
        }

        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.getData()));
        } catch (error) {
        }
    },

    execute: function()
    {

    },

    getData: function()
    {
        var aStorageData = this.__aData;

        if (aStorageData != null) {
            var oNewStorageData = [];

            for (var iKey in aStorageData) {
                oNewStorageData.push(aStorageData[iKey]);
            }

            return oNewStorageData;
        } else {
            return false;
        }
    }
};
/**
 * 비동기식 데이터 - 쿠폰 갯수
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Couponcnt');
CAPP_ASYNC_METHODS.Couponcnt = {
    __iCouponCount: null,

    __$target: EC$('.xans-layout-myshopcouponcount'),
    __$target2: EC$('#xans_myshop_coupon_cnt'),
    __$target3: CAPP_ASYNC_METHODS.$xansMyshopMain.find('.xans_myshop_main_coupon_cnt'),
    __$target4: EC$('#xans_myshop_bankbook_coupon_cnt'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }

            if (this.__$target2.length > 0) {
                return true;
            }

            if (this.__$target3.length > 0) {
                return true;
            }

            if (this.__$target4.length > 0) {
                return true;
            }

            if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('promotion', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
                return true;
            }
        }

        return false;
    },
    
    restoreCache: function()
    {
        var sCookieName = 'couponcount_' + EC_SDE_SHOP_NUM;
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            this.__iCouponCount = parseInt(aCookieValue[1], 10);
            return true;
        }
        
        return false;
    },
    setData: function(sData)
    {
        this.__iCouponCount = Number(sData);
    },

    execute: function()
    {
        this.__$target.html(this.__iCouponCount);

        if (SHOP.getLanguage() === 'ko_KR') {
            this.__$target2.html(this.__iCouponCount + '개');
        } else {
            this.__$target2.html(this.__iCouponCount);
        }

        this.__$target3.html(this.__iCouponCount);
        this.__$target4.html(this.__iCouponCount);
    },

    getData: function()
    {
        return {
            count: this.__iCouponCount
        };
    }
};
/**
 * 비동기식 데이터 - 적립금
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Mileage');
CAPP_ASYNC_METHODS.Mileage = {
    __sAvailMileage: null,
    __sUsedMileage: null,
    __sTotalMileage: null,
    __sUnavailMileage: null,
    __sReturnedMileage: null,

    __$target: EC$('#xans_myshop_mileage'),
    __$target2: EC$('#xans_myshop_bankbook_avail_mileage, #xans_myshop_summary_avail_mileage'),
    __$target3: EC$('#xans_myshop_bankbook_used_mileage, #xans_myshop_summary_used_mileage'),
    __$target4: EC$('#xans_myshop_bankbook_total_mileage, #xans_myshop_summary_total_mileage'),
    __$target5: EC$('#xans_myshop_summary_unavail_mileage'),
    __$target6: EC$('#xans_myshop_summary_returned_mileage'),
    __$target7: EC$('#xans_myshop_avail_mileage'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }

            if (this.__$target2.length > 0) {
                return true;
            }

            if (this.__$target3.length > 0) {
                return true;
            }

            if (this.__$target4.length > 0) {
                return true;
            }

            if (this.__$target5.length > 0) {
                return true;
            }

            if (this.__$target6.length > 0) {
                return true;
            }

            if (this.__$target7.length > 0) {
                return true;
            }

            if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('customer', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
                return true;
            }
        }

        return false;
    },

    restoreCache: function()
    {
        // 특정 경로 룰의 경우 복구 취소
        if (PathRoleValidator.isInvalidPathRole()) {
            return false;
        }

        // 쿠키로부터 데이터 획득
        var sAvailMileage = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_avail_mileage_' + EC_SDE_SHOP_NUM);
        var sReturnedMileage = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_returned_mileage_' + EC_SDE_SHOP_NUM);
        var sUnavailMileage = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_unavail_mileage_' + EC_SDE_SHOP_NUM);
        var sUsedMileage = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_used_mileage_' + EC_SDE_SHOP_NUM);

        // 데이터가 하나라도 없는경우 복구 실패
        if (sAvailMileage === null
            || sReturnedMileage === null
            || sUnavailMileage === null
            || sUsedMileage === null
        ) {
            return false;
        }

        // 전체 마일리지 계산
        var sTotalMileage = (parseFloat(sAvailMileage) +
            parseFloat(sUnavailMileage) +
            parseFloat(sUsedMileage)).toString();

        // 단위정보를 계산하여 필드에 셋
        this.__sAvailMileage = parseFloat(sAvailMileage).toFixed(2);
        this.__sReturnedMileage = parseFloat(sReturnedMileage).toFixed(2);
        this.__sUnavailMileage = parseFloat(sUnavailMileage).toFixed(2);
        this.__sUsedMileage = parseFloat(sUsedMileage).toFixed(2);
        this.__sTotalMileage = parseFloat(sTotalMileage).toFixed(2);

        return true;
    },

    setData: function(aData)
    {
        this.__sAvailMileage = parseFloat(aData['avail_mileage'] || 0).toFixed(2);
        this.__sUsedMileage = parseFloat(aData['used_mileage'] || 0).toFixed(2);
        this.__sTotalMileage = parseFloat(aData['total_mileage'] || 0).toFixed(2);
        this.__sUnavailMileage = parseFloat(aData['unavail_mileage'] || 0).toFixed(2);
        this.__sReturnedMileage = parseFloat(aData['returned_mileage'] || 0).toFixed(2);
    },

    execute: function()
    {
        this.__$target.html(SHOP_PRICE_FORMAT.toShopMileagePrice(this.__sAvailMileage));
        this.__$target2.html(SHOP_PRICE_FORMAT.toShopMileagePrice(this.__sAvailMileage));
        this.__$target3.html(SHOP_PRICE_FORMAT.toShopMileagePrice(this.__sUsedMileage));
        this.__$target4.html(SHOP_PRICE_FORMAT.toShopMileagePrice(this.__sTotalMileage));
        this.__$target5.html(SHOP_PRICE_FORMAT.toShopMileagePrice(this.__sUnavailMileage));
        this.__$target6.html(SHOP_PRICE_FORMAT.toShopMileagePrice(this.__sReturnedMileage));
        this.__$target7.html(SHOP_PRICE_FORMAT.toShopMileagePrice(this.__sAvailMileage));
    },

    getData: function()
    {
        return {
            available_mileage: this.__sAvailMileage,
            used_mileage: this.__sUsedMileage,
            total_mileage: this.__sTotalMileage,
            returned_mileage: this.__sReturnedMileage,
            unavailable_mileage: this.__sUnavailMileage
        };
    }
};
/**
 * 비동기식 데이터 - 예치금
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Deposit');
CAPP_ASYNC_METHODS.Deposit = {
    __sTotalDeposit: null,
    __sAllDeposit: null,
    __sUsedDeposit: null,
    __sRefundWaitDeposit: null,
    __sMemberTotalDeposit: null,

    __$target: EC$('#xans_myshop_deposit'),
    __$target2: EC$('#xans_myshop_bankbook_deposit'),
    __$target3: EC$('#xans_myshop_summary_deposit'),
    __$target4: EC$('#xans_myshop_summary_all_deposit'),
    __$target5: EC$('#xans_myshop_summary_used_deposit'),
    __$target6: EC$('#xans_myshop_summary_refund_wait_deposit'),
    __$target7: EC$('#xans_myshop_total_deposit'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }

            if (this.__$target2.length > 0) {
                return true;
            }

            if (this.__$target3.length > 0) {
                return true;
            }

            if (this.__$target4.length > 0) {
                return true;
            }

            if (this.__$target5.length > 0) {
                return true;
            }

            if (this.__$target6.length > 0) {
                return true;
            }

            if (this.__$target7.length > 0) {
                return true;
            }

            if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('customer', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
                return true;
            }
        }

        return false;
    },

    restoreCache: function()
    {
        // 특정 경로 룰의 경우 복구 취소
        if (PathRoleValidator.isInvalidPathRole()) {
            return false;
        }

        // 쿠키로부터 데이터 획득
        var sAllDeposit = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_all_deposit_' + EC_SDE_SHOP_NUM);
        var sUsedDeposit = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_used_deposit_' + EC_SDE_SHOP_NUM);
        var sRefundWaitDeposit = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_deposit_refund_wait_' + EC_SDE_SHOP_NUM);
        var sMemberTotalDeposit = CAPP_ASYNC_METHODS._getCookie('ec_async_cache_member_total_deposit_' + EC_SDE_SHOP_NUM);

        // 데이터가 하나라도 없는경우 복구 실패
        if (sAllDeposit === null
            || sUsedDeposit === null
            || sRefundWaitDeposit === null
            || sMemberTotalDeposit === null
        ) {
            return false;
        }

        // 사용 가능한 예치금 계산
        var sTotalDeposit = (parseFloat(sAllDeposit) -
            parseFloat(sUsedDeposit) -
            parseFloat(sRefundWaitDeposit)).toString();

        // 단위정보를 계산하여 필드에 셋
        this.__sTotalDeposit = parseFloat(sTotalDeposit).toFixed(2);
        this.__sAllDeposit = parseFloat(sAllDeposit).toFixed(2);
        this.__sUsedDeposit = parseFloat(sUsedDeposit).toFixed(2);
        this.__sRefundWaitDeposit = parseFloat(sRefundWaitDeposit).toFixed(2);
        this.__sMemberTotalDeposit = parseFloat(sMemberTotalDeposit).toFixed(2);

        return true;
    },

    setData: function(aData)
    {
        this.__sTotalDeposit = parseFloat(aData['total_deposit'] || 0).toFixed(2);
        this.__sAllDeposit = parseFloat(aData['all_deposit'] || 0).toFixed(2);
        this.__sUsedDeposit = parseFloat(aData['used_deposit'] || 0).toFixed(2);
        this.__sRefundWaitDeposit = parseFloat(aData['deposit_refund_wait'] || 0).toFixed(2);
        this.__sMemberTotalDeposit = parseFloat(aData['member_total_deposit'] || 0).toFixed(2);
    },

    execute: function()
    {
        this.__$target.html(SHOP_PRICE_FORMAT.toShopDepositPrice(this.__sTotalDeposit));
        this.__$target2.html(SHOP_PRICE_FORMAT.toShopDepositPrice(this.__sTotalDeposit));
        this.__$target3.html(SHOP_PRICE_FORMAT.toShopDepositPrice(this.__sTotalDeposit));
        this.__$target4.html(SHOP_PRICE_FORMAT.toShopDepositPrice(this.__sAllDeposit));
        this.__$target5.html(SHOP_PRICE_FORMAT.toShopDepositPrice(this.__sUsedDeposit));
        this.__$target6.html(SHOP_PRICE_FORMAT.toShopDepositPrice(this.__sRefundWaitDeposit));
        this.__$target7.html(SHOP_PRICE_FORMAT.toShopDepositPrice(this.__sMemberTotalDeposit));
    },

    getData: function()
    {
        return {
            total_deposit: this.__sTotalDeposit,
            used_deposit: this.__sUsedDeposit,
            refund_wait_deposit: this.__sRefundWaitDeposit,
            all_deposit: this.__sAllDeposit,
            member_total_deposit: this.__sMemberTotalDeposit
        };
    }
};
/**
 * 비동기식 데이터 - 위시리스트
 */
CAPP_ASYNC_METHODS.aDatasetList.push('WishList');
CAPP_ASYNC_METHODS.WishList = {
    STORAGE_KEY: 'localWishList' +  EC_SDE_SHOP_NUM,
    __$targetWishIcon: EC$('.icon_img.ec-product-listwishicon'),
    __$targetWishList: EC$('.xans-myshop-wishlist'),
    __aWishList: null,
    __aTags_on: null,
    __aTags_off: null,

    isUse: function()
    {
        if (this.__$targetWishIcon.length > 0 || this.__$targetWishList.length > 0
        || CAPP_ASYNC_METHODS.EC_PATH_ROLE === 'PRODUCT_DETAIL') {
            return true;
        }
        return false;
    },

    restoreCache: function()
    {
        if (!window.sessionStorage) {
            return false;
        }

        var sSessionStorageData = window.sessionStorage.getItem(this.STORAGE_KEY);
        if (sSessionStorageData === null) {
            return false;
        }

        var aStorageData = EC_UTIL.parseJSON(sSessionStorageData);
        if (this.__$targetWishList.length > 0 || aStorageData['isLogin'] !== CAPP_ASYNC_METHODS.IS_LOGIN) {
            this.clearStorage();
            return false;
        }

        var aWishList = aStorageData['wishList'];
        this.__aTags_on = aStorageData['on_tags'];
        this.__aTags_off = aStorageData['off_tags'];
        this.__aWishList = [];
        for (var i = 0; i < aWishList.length; i++) {
            var aTempWishList = [];
            aTempWishList.product_no = aWishList[i];
            this.__aWishList.push(aTempWishList);
        }
        return true;
    },

    setData: function(aData)
    {
        if (aData.hasOwnProperty('wishList') === false || aData.hasOwnProperty('on_tags') === false) {
            return;
        }

        this.__aWishList = aData.wishList;
        this.__aTags_on = aData.on_tags;
        this.__aTags_off = aData.off_tags;

        if (window.sessionStorage) {
            var aWishList = [];

            for (var i = 0; i < aData.wishList.length; i++) {
                aWishList.push(aData.wishList[i].product_no);
            }

            var oNewStorageData = {
                'wishList' : aWishList,
                'on_tags' : aData.on_tags,
                'off_tags' : aData.off_tags,
                'isLogin' : CAPP_ASYNC_METHODS.IS_LOGIN
            };

            if (typeof oNewStorageData !== 'undefined') {
                sessionStorage.setItem(this.STORAGE_KEY , JSON.stringify(oNewStorageData));
            }
        }
    },

    execute: function()
    {
        var aWishList = this.__aWishList;
        var aTagsOn = this.__aTags_on;
        var aTagsOff = this.__aTags_off;

        if (aWishList === null || typeof aWishList === 'undefined') {
            aWishList = [];
        }

        var oTarget = EC$('.ec-product-listwishicon');
        for (var sKey in aTagsOff) {
            oTarget.attr(sKey, aTagsOff[sKey]);
        }

        for (var i = 0; i < aWishList.length; i++) {
            assignAttribute(aWishList[i]);
        }

        /**
         * oTarget 엘레먼트에 aData의 정보를 어싸인함.
         * @param array aData 위시리스트 정보
         */
        function assignAttribute(aData)
        {
            var iProductNo = aData['product_no'];
            var oTarget = EC$('.ec-product-listwishicon[productno="'+iProductNo+'"]');

            // oTarget의 src, alt, icon_status attribute의 값을 할당
            for (var sKey in aTagsOn) {
                oTarget.attr(sKey, aTagsOn[sKey]);
            }
        }

    },

    /**
     * 세션스토리지 삭제
     */
    clearStorage: function()
    {
        if (!window.sessionStorage) {
            return;
        }
        window.sessionStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * sCommand에 따른 sessionStorage Set
     * @param iProductNo
     * @param sCommand 추가(add)/삭제(del) sCommand
     */
    setSessionStorageItem: function(iProductNo, sCommand)
    {
        if (this.isUse() === false) {
            return;
        }

        var oStorageData = EC_UTIL.parseJSON(sessionStorage.getItem(this.STORAGE_KEY));
        var aWishList = oStorageData['wishList'];
        var iLimit = 200;

        if (aWishList === null) {
            aWishList = [];
        }

        var iProductNo = parseInt(iProductNo, 10);
        var iIndex = aWishList.indexOf(iProductNo);

        if (sCommand === 'add') {
            if (aWishList.length >= iLimit) {
                aWishList.splice(aWishList.length - 1, 1);
            }
            if (iIndex < 0) {
                aWishList.unshift(iProductNo);
            }
        } else {
            if (iIndex > -1) {
                aWishList.splice(iIndex, 1);
            }
        }

        oStorageData['wishList'] = aWishList;
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(oStorageData));
    }
};

/**
 * 비동기식 데이터 - 관심상품 갯수
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Wishcount');
CAPP_ASYNC_METHODS.Wishcount = {
    __iWishCount: null,

    __$target: EC$('#xans_myshop_interest_prd_cnt'),
    __$target2: CAPP_ASYNC_METHODS.$xansMyshopMain.find('.xans_myshop_main_interest_prd_cnt'),

    isUse: function()
    {
        if (this.__$target.length > 0) {
            return true;
        }
        if (this.__$target2.length > 0) {
            return true;
        }

        if ( typeof EC_APPSCRIPT_SDK_DATA != "undefined" && EC$.inArray('personal', EC_APPSCRIPT_SDK_DATA ) > -1 ) {
            return true;
        }

        return false;
    },

    restoreCache: function()
    {
        var sCookieName = 'wishcount_' + EC_SDE_SHOP_NUM;
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            this.__iWishCount = parseInt(aCookieValue[1], 10);
            return true;
        }

        return false;
    },

    setData: function(sData)
    {
        this.__iWishCount = Number(sData);
    },

    execute: function()
    {
        if (SHOP.getLanguage() === 'ko_KR') {
            this.__$target.html(this.__iWishCount + '개');
        } else {
            this.__$target.html(this.__iWishCount);
        }

        this.__$target2.html(this.__iWishCount);
    },

    getData: function()
    {
        return {
            count: this.__iWishCount
        };
    }
};
/**
 * 비동기식 데이터 - 최근 본 상품
 */
CAPP_ASYNC_METHODS.aDatasetList.push('recent');
CAPP_ASYNC_METHODS.recent = {
    STORAGE_KEY: 'localRecentProduct' +  EC_SDE_SHOP_NUM,

    __$target: EC$('.xans-layout-productrecent'),

    __aData: null,

    isUse: function()
    {
        this.__$target.hide();

        if (this.__$target.find('.xans-record-').length > 0) {
            return true;
        }

        return false;
    },

    restoreCache: function()
    {
        this.__aData = [];

        var iTotalCount = CAPP_ASYNC_METHODS.RecentTotalCount.getData();
        if (iTotalCount == 0) {
            // 총 갯수가 없는 경우 복구할 것이 없으므로 복구한 것으로 리턴
            return true;
        }

        var sAdultImage = '';

        if (window.sessionStorage === undefined) {
            return false;
        }

        var sSessionStorageData = window.sessionStorage.getItem(this.STORAGE_KEY);
        if (sSessionStorageData === null) {
            return false;
        }

        var iViewCount = EC_FRONT_JS_CONFIG_SHOP.recent_count;

        this.__aData = [];
        var aStorageData = EC_UTIL.parseJSON(sSessionStorageData);
        var iCount = 1;
        var bDispRecent = true;
        for (var iKey in aStorageData) {
            var sProductImgSrc = aStorageData[iKey].sImgSrc;

            if (isFinite(iKey) === false) {
                continue;
            }

            var aDataTmp = [];
            aDataTmp.recent_img = getImageUrl(sProductImgSrc);
            aDataTmp.name = aStorageData[iKey].sProductName;
            aDataTmp.disp_recent = true;
            aDataTmp.is_adult_product = aStorageData[iKey].isAdultProduct;
            aDataTmp.link_product_detail = aStorageData[iKey].link_product_detail;

            //aDataTmp.param = '?product_no=' + aStorageData[iKey].iProductNo + '&cate_no=' + aStorageData[iKey].iCateNum + '&display_group=' + aStorageData[iKey].iDisplayGroup;
            aDataTmp.param = filterXssUrlParameter(aStorageData[iKey].sParam);
            if ( iViewCount < iCount ) {
                bDispRecent = false;
            }
            aDataTmp.disp_recent = bDispRecent;

            iCount++;
            this.__aData.push(aDataTmp);
        }

        return true;

        /**
         * get SessionStorage image url
         * @param sNewImgUrl DB에 저장되어 있는 tiny값
         */
        function getImageUrl(sImgUrl)
        {
            if (typeof(sImgUrl) === 'undefined' || sImgUrl === null) {
                return;
            }
            var sNewImgUrl = '';

            if (sImgUrl.indexOf('http://') >= 0 || sImgUrl.indexOf('https://') >= 0 || sImgUrl.substr(0, 2) === '//') {
                sNewImgUrl = sImgUrl;
            } else {
                sNewImgUrl = EC_FRONT_JS_CONFIG_SHOP.cdnUrl + '/web/product/tiny/' + sImgUrl;
            }

            return sNewImgUrl;
        }

        /**
         * 파라미터 URL에서 XSS 공격 관련 파라미터를 필터링합니다. ECHOSTING-162977
         * @param string sParam 파라미터
         * @return string 필터링된 파라미터
         */
        function filterXssUrlParameter(sParam)
        {
            sParam = sParam || '';

            var sPrefix = '';
            if (sParam.substr(0, 1) === '?') {
                sPrefix = '?';
                sParam = sParam.substr(1);
            }

            var aParam = {};

            var aParamList = (sParam).split('&');
            EC$.each(aParamList, function() {
                var aMatch = this.match(/^([^=]+)=(.*)$/);
                if (aMatch) {
                    aParam[aMatch[1]] = aMatch[2];
                }
            });

            return sPrefix + EC$.param(aParam);
        }

    },

    setData: function(aData)
    {
        this.__aData = aData;

        // 쿠키엔 있지만 sessionStorage에 없는 데이터 복구
        if (window.sessionStorage) {

            var oNewStorageData = [];

            for ( var i = 0; i < aData.length; i++) {
                if (aData[i].bNewProduct !== true) {
                    continue;
                }

                var aNewStorageData = {
                    'iProductNo': aData[i].product_no,
                    'sProductName': aData[i].name,
                    'sImgSrc': aData[i].recent_img,
                    'sParam': aData[i].param,
                    'link_product_detail': aData[i].link_product_detail
                };

                oNewStorageData.push(aNewStorageData);
            }

            if ( oNewStorageData.length > 0 ) {
                sessionStorage.setItem(this.STORAGE_KEY , JSON.stringify(oNewStorageData));
            }
        }
    },

    execute: function()
    {
        var sAdult19Warning = EC_FRONT_JS_CONFIG_SHOP.adult19Warning;

        var aData = this.__aData;

        var aNodes = this.__$target.find('.xans-record-');
        var iRecordCnt = aNodes.length;
        var iAddedElementCount = 0;

        var aNodesParent = EC$(aNodes[0]).parent();
        for ( var i = 0; i < aData.length; i++) {
            if (!aNodes[i]) {
                EC$(aNodes[iRecordCnt - 1]).clone().appendTo(aNodesParent);
                iAddedElementCount++;
            }
        }

        if (iAddedElementCount > 0) {
            aNodes = this.__$target.find('.xans-record-');
        }

        if (aData.length > 0) {
            this.__$target.show();
        }

        for ( var i = 0; i < aData.length; i++) {
            assignVariables(aNodes[i], aData[i]);
        }

        // 종료 카운트 지정
        if (aData.length < aNodes.length) {
            iLength = aData.length;
            deleteNode();
        }

        recentBntInit(this.__$target);

        /**
         * 패치되지 않은 노드를 제거
         */
        function deleteNode()
        {
            for ( var i = iLength; i < aNodes.length; i++) {
                EC$(aNodes[i]).remove();
            }
        }

        /**
         * oTarget 엘레먼트에 aData의 변수를 어싸인합니다.
         * @param Element oTarget 변수를 어싸인할 엘레먼트
         * @param array aData 변수 데이터
         */
        function assignVariables(oTarget, aData)
        {
            var recentImage = aData.recent_img;

            if (sAdult19Warning === 'T' && CAPP_ASYNC_METHODS.member.getMemberIsAdult() === 'F' && aData.is_adult_product === 'T') {
                    recentImage = EC_FRONT_JS_CONFIG_SHOP.adult19BaseTinyImage;
            }

            var $oTarget = EC$(oTarget);

            var sHtml = $oTarget.html();

            sHtml = sHtml.replace('about:blank', recentImage)
                         .replace('##param##', aData.param)
                         .replace('##name##',aData.name)
                         .replace('##link_product_detail##', aData.link_product_detail);
            $oTarget.html(sHtml);

            if (aData.disp_recent === true) {
                $oTarget.removeClass('displaynone');
            }
        }

        function recentBntInit($target)
        {
            // 화면에 뿌려진 갯수
            var iDisplayCount = 0;
            // 보여지는 style
            var sDisplay = '';
            var iIdx = 0;
            //
            var iDisplayNoneIdx = 0;

            var nodes = $target.find('.xans-record-').each(function()
            {
                sDisplay = EC$(this).css('display');
                if (sDisplay != 'none') {
                    iDisplayCount++;
                } else {
                    if (iDisplayNoneIdx == 0) {
                        iDisplayNoneIdx = iIdx;
                    }

                }
                iIdx++;
            });

            var iRecentCount = nodes.length;
            var bBtnActive = iDisplayCount > 0;
            EC$('.xans-layout-productrecent .prev').off('click').click(function()
            {
                if (bBtnActive !== true) return;
                var iFirstNode = iDisplayNoneIdx - iDisplayCount;
                if (iFirstNode == 0 || iDisplayCount == iRecentCount) {
                    alert(__('최근 본 첫번째 상품입니다.'));
                    return;
                } else {
                    iDisplayNoneIdx--;
                    EC$(nodes[iDisplayNoneIdx]).hide();
                    EC$(nodes[iFirstNode - 1]).removeClass('displaynone');
                    EC$(nodes[iFirstNode - 1]).fadeIn('fast');

                }
            }).css(
            {
                cursor : 'pointer'
            });

            EC$('.xans-layout-productrecent .next').off('click').click(function()
            {
                if (bBtnActive !== true) return;
                if ( (iRecentCount ) == iDisplayNoneIdx || iDisplayCount == iRecentCount) {
                    alert(__('최근 본 마지막 상품입니다.'));
                } else {
                    EC$(nodes[iDisplayNoneIdx]).fadeIn('fast');
                    EC$(nodes[iDisplayNoneIdx]).removeClass('displaynone');
                    EC$(nodes[ (iDisplayNoneIdx - iDisplayCount)]).hide();
                    iDisplayNoneIdx++;
                }
            }).css(
            {
                cursor : 'pointer'
            });

        }

    }
};

/**
 * 비동기식 데이터 - 최근본상품 총 갯수
 */
CAPP_ASYNC_METHODS.aDatasetList.push('RecentTotalCount');
CAPP_ASYNC_METHODS.RecentTotalCount = {
    __iRecentCount: null,

    __$target: CAPP_ASYNC_METHODS.$xansMyshopMain.find('.xans_myshop_main_recent_cnt'),

    isUse: function()
    {
        if (this.__$target.length > 0) {
            return true;
        }

        return false;
    },

    restoreCache: function()
    {
        var sCookieName = 'recent_plist';
        if (EC_SDE_SHOP_NUM > 1) {
            sCookieName = 'recent_plist' + EC_SDE_SHOP_NUM;
        }
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            this.__iRecentCount = decodeURI(aCookieValue[1]).split('|').length;
        } else {
            this.__iRecentCount = 0;
        }
    },

    execute: function()
    {
        this.__$target.html(this.__iRecentCount);
    },

    getData: function()
    {
        if (this.__iRecentCount === null) {
            // this.isUse값이 false라서 복구되지 않았는데 이 값이 필요한 경우 복구
            this.restoreCache();
        }

        return this.__iRecentCount;
    }
};
/**
 * 비동기식 데이터 - 주문정보
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Order');
CAPP_ASYNC_METHODS.Order = {
    __iOrderCount: null,
    __iOrderTotalPrice: null,
    __iGradeIncreaseValue: null,

    __$target: EC$('#xans_myshop_bankbook_order_count'),
    __$target2: EC$('#xans_myshop_bankbook_order_price'),
    __$target3: EC$('#xans_myshop_bankbook_grade_increase_value'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }

            if (this.__$target2.length > 0) {
                return true;
            }

            if (this.__$target3.length > 0) {
                return true;
            }
        }
        
        return false;        
    },

    restoreCache: function()
    {
        var sCookieName = 'order_' + EC_SDE_SHOP_NUM;
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            var aData = EC_UTIL.parseJSON(decodeURIComponent(aCookieValue[1]));
            this.__iOrderCount = aData.total_order_count;
            this.__iOrderTotalPrice = aData.total_order_price;
            this.__iGradeIncreaseValue = Number(aData.grade_increase_value);
            return true;
        }

        return false;
    },

    setData: function(aData)
    {
        this.__iOrderCount = aData['total_order_count'];
        this.__iOrderTotalPrice = aData['total_order_price'];
        this.__iGradeIncreaseValue = Number(aData['grade_increase_value']);
    },

    execute: function()
    {
        this.__$target.html(this.__iOrderCount);
        this.__$target2.html(this.__iOrderTotalPrice);
        this.__$target3.html(this.__iGradeIncreaseValue);
    },

    getData: function()
    {
        return {
            total_order_count: this.__iOrderCount,
            total_order_price: this.__iOrderTotalPrice,
            grade_increase_value: this.__iGradeIncreaseValue
        };
    }
};
/**
 * 비동기식 데이터 - Benefit
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Benefit');
CAPP_ASYNC_METHODS.Benefit = {
    __aBenefit: null,
    __$target: EC$('.xans-myshop-asyncbenefit'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }
        }

        return false;
    },

    setData: function(aData)
    {
        this.__aBenefit = aData;
    },

    execute: function()
    {
        var aFilter = ['group_image_tag', 'group_icon_tag', 'display_no_benefit', 'display_with_all', 'display_mobile_use_dc', 'display_mobile_use_mileage'];
        var __aData = this.__aBenefit;
        
        // 그룹이미지
        EC$('.myshop_benefit_group_image_tag').attr({alt: __aData['group_name'], src: __aData['group_image']});

        // 그룹아이콘
        EC$('.myshop_benefit_group_icon_tag').attr({alt: __aData['group_name'], src: __aData['group_icon']});

        if (__aData['display_no_benefit'] === true) {
            EC$('.myshop_benefit_display_no_benefit').removeClass('displaynone').show();
        }
        
        if (__aData['display_with_all'] === true) {
            EC$('.myshop_benefit_display_with_all').removeClass('displaynone').show();
        }
        
        if (__aData['display_mobile_use_dc'] === true) {
            EC$('.myshop_benefit_display_mobile_use_dc').removeClass('displaynone').show();
        } 
        
        if (__aData['display_mobile_use_mileage'] === true) {
            EC$('.myshop_benefit_display_mobile_use_mileage').removeClass('displaynone').show();
        }

        EC$.each(__aData, function(key, val) {
            if (EC$.inArray(key, aFilter) === -1) {
                EC$('.myshop_benefit_' + key).html(val);
            }
        });
    }    
};
/**
 * 비동기식 데이터 - 비동기장바구니 레이어
 */
CAPP_ASYNC_METHODS.aDatasetList.push('BasketLayer');
CAPP_ASYNC_METHODS.BasketLayer = {
    __sBasketLayerHtml: null,
    __$target: document.getElementById('ec_async_basket_layer_container'),

    isUse: function()
    {
        if (this.__$target !== null) {
            return true;
        }
        return false;
    },

    execute: function()
    {
        EC$.ajax({
            url: '/order/async_basket_layer.html?__popupPage=T',
            async: false,
            success: function(data) {
                var sBasketLayerHtml = data;
                var sBasketLayerStyle = '';
                var sBasketLayerBody = '';

                sBasketLayerHtml = sBasketLayerHtml.replace(/<script([\s\S]*?)<\/script>/gi,''); // 스크립트 제거
                sBasketLayerHtml = sBasketLayerHtml.replace(/<link([\s\S]*?)\/>/gi,''); // 옵티마이져 제거

                var regexStyle = /<style([\s\S]*?)<\/style>/; // Style 추출
                if (regexStyle.exec(sBasketLayerHtml) != null) sBasketLayerStyle = regexStyle.exec(sBasketLayerHtml)[0];

                var regexBody = /<body[\s\S]*?>([\s\S]*?)<\/body>/; // Body 추출
                if (regexBody.exec(sBasketLayerHtml) != null) sBasketLayerBody = regexBody.exec(sBasketLayerHtml)[1];

                CAPP_ASYNC_METHODS.BasketLayer.__sBasketLayerHtml = sBasketLayerStyle + sBasketLayerBody;
            }
        });
        this.__$target.innerHTML = this.__sBasketLayerHtml;
    }
};
/**
 * 비동기식 데이터 - Benefit
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Grade');
CAPP_ASYNC_METHODS.Grade = {
    __aGrade: null,
    __$target: EC$('#sGradeAutoDisplayArea'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }
        }

        return false;
    },

    setData: function(aData)
    {
        this.__aGrade = aData;
    },

    execute: function()
    {
        var __aData = this.__aGrade;
        var aFilter = ['bChangeMaxTypePrice', 'bChangeMaxTypePriceAndCount', 'bChangeMaxTypePriceOrCount', 'bChangeMaxTypeCount'];

        var aMaxDisplayJson = {
            "bChangeMaxTypePrice": [
                {"sId": "sChangeMaxTypePriceArea"}
            ],
            "bChangeMaxTypePriceAndCount": [
                {"sId": "sChangeMaxTypePriceAndCountArea"}
            ],
            "bChangeMaxTypePriceOrCount": [
                {"sId": "sChangeMaxTypePriceOrCountArea"}
            ],
            "bChangeMaxTypeCount": [
                {"sId": "sChangeMaxTypeCountArea"}
            ]
        };

        if (EC$('.sNextGroupIconArea').length > 0) {
            if (__aData['bDisplayNextGroupIcon'] === true) {
                EC$('.sNextGroupIconArea').removeClass('displaynone').show();
                EC$('.myshop_benefit_next_group_icon_tag').attr({alt: __aData['sNextGrade'], src: __aData['sNextGroupIcon']});
            } else {
                EC$('.sNextGroupIconArea').addClass('displaynone');
            }
        }

        var sIsAutoGradeDisplay = "F";
        EC$.each(__aData, function(key, val) {
            if (EC$.inArray(key, aFilter) === -1) {
                return true;
            }
            if (val === true) {
                if (EC$('#'+aMaxDisplayJson[key][0].sId).length > 0) {
                    EC$('#' + aMaxDisplayJson[key][0].sId).removeClass('displaynone').show();
                }
                sIsAutoGradeDisplay = "T";
            }
        });
        if (sIsAutoGradeDisplay == "T" && EC$('#sGradeAutoDisplayArea .sAutoGradeDisplay').length > 0) {
            EC$('#sGradeAutoDisplayArea .sAutoGradeDisplay').addClass('displaynone');
        }

        EC$.each(__aData, function(key, val) {
            if (EC$.inArray(key, aFilter) === -1) {
                if (EC$('.xans-member-var-' + key).length > 0) {
                    EC$('.xans-member-var-' + key).html(val);
                }
            }
        });
    }    
};
/**
 * 비동기식 데이터 - Benefit
 */
CAPP_ASYNC_METHODS.aDatasetList.push('AutomaticGradeShow');
CAPP_ASYNC_METHODS.AutomaticGradeShow = {
    __aGrade: null,
    __$target: EC$('#sAutomaticGradeShowArea'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }
        }
        return false;
    },

    setData: function(aData)
    {
        this.__aGrade = aData;
    },

    execute: function()
    {
        var __aData = this.__aGrade;

        /**
         * 아이콘 표기 제외
        if (EC$('.sNextGroupIconArea').length > 0) {
            if (__aData['bDisplayNextGroupIcon'] === true) {
                EC$('.sNextGroupIconArea').removeClass('displaynone').show();
                EC$('.myshop_benefit_next_group_icon_tag').attr({alt: __aData['sNextGrade'], src: __aData['sNextGroupIcon']});
            } else {
                EC$('.sNextGroupIconArea').addClass('displaynone');
            }
        }
         */

        var sIsAutoGradeDisplay = "F";
        EC$.each(__aData, function(key, val) {
            if (val === true) {
                sIsAutoGradeDisplay = "T";
                return false;
            }
        });
        if (sIsAutoGradeDisplay == "T" && EC$('#sAutomaticGradeShowArea .sAutoGradeDisplay').length > 0) {
            EC$('#sAutomaticGradeShowArea .sAutoGradeDisplay').addClass('displaynone');
        }

        EC$.each(__aData, function(key, val) {
            if (EC$('.xans-member-var-' + key).length > 0) {
                EC$('.xans-member-var-' + key).html(val);
            }
        });
    }    
};
/**
 * 비동기식 데이터 - 비동기장바구니 레이어
 */
CAPP_ASYNC_METHODS.aDatasetList.push('MobileMutiPopup');
CAPP_ASYNC_METHODS.MobileMutiPopup = {
    __$target: EC$('div[class^="ec-async-multi-popup-layer-container"]'),

    isUse: function()
    {
        if (this.__$target.length > 0) {
            return true;
        }
        return false;
    },

    execute: function()
    {
        for (var i=0; i < this.__$target.length; i++) {
            EC$.ajax({
                url: '/exec/front/popup/AjaxMultiPopup?index='+i,
                data : EC_ASYNC_MULTI_POPUP_OPTION[i],
                dataType: "json",
                success : function (oResult) {
                    switch (oResult.code) {
                        case '0000' :
                            if (oResult.data.length < 1) {
                                break;
                            }
                            EC$('.ec-async-multi-popup-layer-container-' + oResult.data.html_index).html(oResult.data.html_text);
                            if (oResult.data.type == 'P') {
                                BANNER_POPUP_OPEN.setPopupSetting();
                                BANNER_POPUP_OPEN.setPopupWidth();
                                BANNER_POPUP_OPEN.setPopupClose();
                            } else {
                                /**
                                 * 이중 스크롤 방지 클래스 추가(비동기) 
                                 *
                                 */
                                EC$('body').addClass('eMobilePopup');
                                EC$('body').width('100%');

                                BANNER_POPUP_OPEN.setFullPopupSetting();
                                BANNER_POPUP_OPEN.setFullPopupClose();
                            }
                            break;
                        default :
                            break;
                    }
                },
                error : function () {
                }
            });
        }
    }
};
/**
 * 비동기식 데이터 - 좋아요 상품 갯수
 */
CAPP_ASYNC_METHODS.aDatasetList.push('MyLikeProductCount');
CAPP_ASYNC_METHODS.MyLikeProductCount = {
    __iMyLikeCount: null,

    __$target: EC$('#xans_myshop_like_prd_cnt'),
    __$target_main: EC$('#xans_myshop_main_like_prd_cnt'),
    isUse: function()
    {
        if (this.__$target.length > 0 && SHOP.getLanguage() === 'ko_KR') {
            return true;
        }

        if (this.__$target_main.length > 0 && SHOP.getLanguage() === 'ko_KR') {
            return true;
        }

        return false;
    },
    restoreCache: function()
    {
        var sCookieName = 'like_product_cnt' + EC_SDE_SHOP_NUM;
        var re = new RegExp('(?:^| |;)' + sCookieName + '=([^;]+)');
        var aCookieValue = document.cookie.match(re);
        if (aCookieValue) {
            this.__iMyLikeCount = parseInt(aCookieValue[1], 10);
            return true;
        }

        return false;
    },

    setData: function(sData)
    {
        this.__iMyLikeCount = Number(sData);
    },

    execute: function()
    {
        if (SHOP.getLanguage() === 'ko_KR') {
            this.__$target.html(this.__iMyLikeCount + '개');
            this.__$target_main.html(this.__iMyLikeCount);
        }
    }
};
/**
 * 비동기식 데이터 - 좋아요 상품 list
 */
CAPP_ASYNC_METHODS.aDatasetList.push('MyLikeProductList');
CAPP_ASYNC_METHODS.MyLikeProductList = {
    __aMyLikeList: null,
    __iMyLikeListLimit : 10,
    __$target: EC$('.xans-product-likeproductasync'),
    isUse: function()
    {
        if (this.__$target.length > 0 && SHOP.getLanguage() === 'ko_KR') {
            return true;
        }

        if (EC$('#EC_LIKE_ASYNC_LINK_DATA_LIST').length > 0) {
            return true;
        }
        return false;
    },
    setData: function(aData)
    {
        this.__iMyLikeListLimit = EC_FRONT_JS_CONFIG_SHOP.aSyncLikeLimit;
        this.__aMyLikeList = aData;
    },
    execute: function()
    {

        if (this.__aMyLikeList === null || this.__aMyLikeList.length === 0) {
            EC$('#EC_LIKE_ASYNC_LINK_DATA_EMPTY').html('');
            return;
        }

        //EC$('#EC_LIKE_ASYNC_LINK_DATA_EMPTY').remove();
        var sSpaceIcon = ' ';
        for (var iKey = 0; iKey < this.__aMyLikeList.length ; iKey++) {
            var oRowData = EC$('#EC_LIKE_ASYNC_LINK_DATA_LIST_TEMP').clone().removeAttr('id');
            oRowData.find('a[href^="/product/detail.html"').attr('href', this.__aMyLikeList[iKey].link_product_detail);
            oRowData.find('.thumb img').attr('src',this.__aMyLikeList[iKey].image_medium);
            oRowData.find('.EC_LIKE_ASYNC_LINK_DATA_PRODUCT_NAME').html('<a href="' + this.__aMyLikeList[iKey].link_product_detail + '">' + this.__aMyLikeList[iKey].disp_product_name + '</a>');

            var sIconListHtml = this.__aMyLikeList[iKey].soldout_icon + sSpaceIcon +  this.__aMyLikeList[iKey].stock_icon + sSpaceIcon + this.__aMyLikeList[iKey].recommend_icon + sSpaceIcon +
                this.__aMyLikeList[iKey].new_icon + sSpaceIcon + this.__aMyLikeList[iKey].product_icons + sSpaceIcon + this.__aMyLikeList[iKey].benefit_icons;
             if (sIconListHtml !== '') {
                oRowData.find('.EC_LIKE_ASYNC_LINK_DATA_ICON_LIST').html(sIconListHtml);
            }

            EC$('#EC_LIKE_ASYNC_LINK_DATA_APPEND').append(oRowData);

            if (iKey >= (this.__iMyLikeListLimit - 1)) {
                break;
            }
        }
        EC$('#EC_LIKE_ASYNC_LINK_DATA_LIST_TEMP').remove();
        if (this.__aMyLikeList.length < this.__iMyLikeListLimit) {
            EC$('#EC_LIKE_ASYNC_LINK_DATA_MORE_VIEW').remove();
        }

        if (EC_FRONT_JS_CONFIG_SHOP.bAutoView === 'T') {
            document.getElementById('EC_LIKE_ASYNC_LINK_DATA_LIST').style.display = 'block';
        }

    }
};
/**
 * 라이브 링콘 on/off이미지
 */
CAPP_ASYNC_METHODS.aDatasetList.push('Livelinkon');
CAPP_ASYNC_METHODS.Livelinkon = {
    __$target: EC$('#ec_livelinkon_campain_on'),
    __$target2: EC$('#ec_livelinkon_campain_off'),

    isUse: function()
    {
        if (this.__$target.length > 0 && this.__$target2.length > 0) {
            return true;
        }
        return false;
    },

    execute: function()
    {
        var sCampaignid = '';
        if (EC_ASYNC_LIVELINKON_ID != undefined) {
            sCampaignid = EC_ASYNC_LIVELINKON_ID;
        }
        EC$.ajax({
            url: '/exec/front/Livelinkon/Campaignajax?campaign_id='+sCampaignid,
            async: false,
            success: function(data) {
                if (data == 'on') {
                    CAPP_ASYNC_METHODS.Livelinkon.__$target.removeClass('displaynone').show();
                    CAPP_ASYNC_METHODS.Livelinkon.__$target2.removeClass('displaynone').hide();
                } else if (data == 'off') {
                    CAPP_ASYNC_METHODS.Livelinkon.__$target.removeClass('displaynone').hide();
                    CAPP_ASYNC_METHODS.Livelinkon.__$target2.removeClass('displaynone').show();
                } else {
                    CAPP_ASYNC_METHODS.Livelinkon.__$target.removeClass('displaynone').hide();
                    CAPP_ASYNC_METHODS.Livelinkon.__$target2.removeClass('displaynone').hide();
                }
            }
        });
    }
};
/**
 * 비동기식 데이터 - 마이쇼핑 > 주문 카운트 (주문 건수 / CS건수 / 예전주문)
 */
CAPP_ASYNC_METHODS.aDatasetList.push('OrderHistoryCount');
CAPP_ASYNC_METHODS.OrderHistoryCount = {
    __sTotalOrder: null,
    __sTotalOrderCs: null,
    __sTotalOrderOld: null,

    __$target: EC$('#ec_myshop_total_orders'),
    __$target2: EC$('#ec_myshop_total_orders_cs'),
    __$target3: EC$('#ec_myshop_total_orders_old'),

    isUse: function()
    {
        if (CAPP_ASYNC_METHODS.IS_LOGIN === true) {
            if (this.__$target.length > 0) {
                return true;
            }

            if (this.__$target2.length > 0) {
                return true;
            }

            if (this.__$target3.length > 0) {
                return true;
            }
        }

        return false;
    },

    setData: function(aData)
    {
        this.__sTotalOrder = aData['total_orders'];
        this.__sTotalOrderCs = aData['total_orders_cs'];
        this.__sTotalOrderOld = aData['total_orders_old'];

    },

    execute: function()
    {
        this.__$target.html(this.__sTotalOrder);
        this.__$target2.html(this.__sTotalOrderCs);
        this.__$target3.html(this.__sTotalOrderOld);
    }
};
