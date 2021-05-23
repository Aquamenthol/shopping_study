/**
 * FwValidator
 *
 * @package     jquery
 * @subpackage  validator
 */

var FwValidator = {

    /**
     * 디버그 모드
     */
    DEBUG_MODE : false,

    /**
     * 결과 코드
     */
    CODE_SUCCESS    : true,
    CODE_FAIL       : false,

    /**
     * 어트리뷰트 명
     */
    ATTR_FILTER     : 'fw-filter',
    ATTR_MSG        : 'fw-msg',
    ATTR_LABEL      : 'fw-label',
    ATTR_FIREON     : 'fw-fireon',
    ATTR_ALONE      : 'fw-alone',

    /**
     * 응답객체들
     */
    responses       : {},

    /**
     * 엘리먼트별 필수 입력 에러 메세지
     */
    requireMsgs     : {},

    /**
     * 엘리먼트의 특정 필터별 에러 메세지
     */
    elmFilterMsgs   : {},

    /**
     * jQuery 별칭 정의
     * EC$ 가 기본으로 로드되지 않는 환경에서 사용시에 대한 처리
     */
    jQuery          : window.EC$ || window.$,

    /**
     * Validator 기본 이벤트 등록
     */
    bind : function(formId, expand) {

        var self = this;
        var formInfo = this.Helper.getFormInfo(formId);

        if (formInfo === false) {
            alert('The form does not exist - bind');
            return false;
        }

        var elmForm = formInfo.instance;

        var Response = this._response(formId);

        this._fireon(formId, elmForm, Response);
        this._submit(formId, elmForm, expand);

        return true;

    },

    /**
     * Validator 검사 진행
     *
     * @param string formId
     * @return object | false
     */
    inspection : function(formId, expand) {

        expand = (expand === true) ? true : false;

        var self = this;
        var Response = this._response(formId);

        if (Response === false) {
            alert('The form does not exist - inspection');
            return false;
        }

        if (Response.elmsTarget.length == 0) {
            return this.Helper.getResult(Response, this.CODE_SUCCESS);
        }

        Response.elmsTarget.each(function(){
            self._execute(Response, this);
        });

        if (Response.elmsCurrErrorField.length > 0) {

            if (expand !== true) {
                this.Handler.errorHandler(Response.elmsCurrErrorField[0]);
            } else {
                this.Handler.errorHandlerByExapnd(Response);
            }

            return Response.elmsCurrErrorField[0];

        }

        return this.Helper.getResult(Response, this.CODE_SUCCESS);

    },

    /**
     * submit 이벤트 등록
     *
     * @param string    formId
     * @param object    elmForm
     */
    _submit : function(formId, elmForm, expand) {
        var self = this;
        var handler = function(event){
            var result = false;

            // 중복 요청 방지로 추가
            event.stopImmediatePropagation();

            try{
                result = self.inspection(formId, expand);
            }catch(e){
                alert(e);
                return false;
            }

            if(!result || result.passed === self.CODE_FAIL){
                return false;
            };

            var callback = self._beforeSubmit(elmForm);

            return callback !== false ? true : false;
        };

        elmForm.unbind('submit');
        elmForm.bind('submit', handler);

        // window.$에서 submit() 처리시 오동작으로 인해 추가 
        if (this.jQuery !== window.$) {
            $(elmForm).unbind('submit');
            $(elmForm).bind('submit', handler);
        }
    },

    /**
     * fireon 이벤트 등록
     *
     * @param string                formId
     * @param object                elmForm
     * @param FwValidator.Response  Response
     */
    _fireon : function(formId, elmForm, Response) {
        var $ = this.jQuery;
        var self = this;
        var formInfo = this.Helper.getFormInfo(formId);

        $(formInfo.selector).find('*['+this.ATTR_FILTER+']['+this.ATTR_FIREON+']').each(function(){
            var elm = $(this);
            var evtName = self.Helper.trim(elm.attr(self.ATTR_FIREON));
            var elmMsg = '';

            elm.unbind(evtName);
            elm.bind(evtName, function(){
                var result = self._execute(Response, this);
                var targetField = Response.elmCurrField;

                //에러 메세지가 출력되 있다면 일단 지우고 체킹을 시작한다.
                if(typeof elmMsg == 'object'){
                    elmMsg.remove();
                }

                if(result > -1){
                    elmMsg = self.Handler.errorHandlerByFireon(Response.elmsCurrErrorField[result]);
                }else{
                    self.Handler.successHandlerByFireon(self.Helper.getResult(Response, self.CODE_FAIL));
                }
            });
        });
    },

    /**
     * Response 객체 생성
     *
     * @param string formId
     * @return FwValidator.Response | false
     */
    _response : function(formId) {
        var $ = this.jQuery;
        var formInfo = this.Helper.getFormInfo(formId);

        if (formInfo === false) {
            alert('The form does not exist - find');
            return false;
        }

        var elmForm = formInfo.instance;
        var elmsTarget = $(formInfo.selector).find('*[' + this.ATTR_FILTER + ']');

        this.responses[formId] = new FwValidator.Response();

        this.responses[formId].formId = formId;
        this.responses[formId].elmForm = elmForm;
        this.responses[formId].elmsTarget = elmsTarget;

        return this.responses[formId];

    },

    /**
     * BeforeExecute 콜백함수 실행
     *
     * @param FwValidator.Response Response
     */
    _beforeExecute : function(Response) {

        var count = this.Handler.beforeExecute.length;

        if (count == 0) return;

        for (var i in this.Handler.beforeExecute) {
            this.Handler.beforeExecute[i].call(this, Response);
        }

    },

    /**
     * BeforeSubmit 콜백함수 실행
     *
     * @param object elmForm (jquery 셀렉터 문법으로 찾아낸 폼 객체)
     */
    _beforeSubmit : function(elmForm) {

        if(typeof this.Handler.beforeSubmit != 'function') return true;

        return this.Handler.beforeSubmit.call(this, elmForm);

    },

    /**
     * 엘리먼트별 유효성 검사 실행
     *
     * @param FwValidator.Response  Response
     * @param htmlElement           elmTarget
     * @return int(에러가 발생한 elmCurrField 의 인덱스값) | -1(성공)
     */
    _execute : function(Response, elmTarget) {
        var $ = this.jQuery;
        var RESULT_SUCCESS = -1;

        Response.elmCurrField = $(elmTarget);
        Response.elmCurrLabel = Response.elmCurrField.attr(this.ATTR_LABEL);
        Response.elmCurrFieldType = this.Helper.getElmType(Response.elmCurrField);
        Response.elmCurrFieldDisabled = elmTarget.disabled;
        Response.elmCurrValue = this.Helper.getValue(Response.formId, Response.elmCurrField);
        Response.elmCurrErrorMsg = Response.elmCurrField.attr(this.ATTR_MSG);

        //_beforeExecute 콜백함수 실행
        this._beforeExecute(Response);

        //필드가 disabled 일 경우는 체크하지 않음.
        if (Response.elmCurrFieldDisabled === true) {
            return RESULT_SUCCESS;
        }

        var filter = this.Helper.trim( Response.elmCurrField.attr(this.ATTR_FILTER) );

        if (filter == '') {
            return RESULT_SUCCESS;
        }

        //is로 시작하지 않는것들은 정규표현식으로 간주
        if (/^is/i.test(filter)) {
            var filters = filter.split('&');
            var count = filters.length;

            //필수항목이 아닌경우 빈값이 들어왔을경우는 유효성 체크를 통과시킴

            if ((/isFill/i.test(filter) === false) && !Response.elmCurrValue) {
                return RESULT_SUCCESS;
            }

            for (var i=0; i < count; ++i) {
                var filter = filters[i];
                var param = '';
                var filtersInfo = this.Helper.getFilterInfo(filter);

                filter = Response.elmCurrFilter = filtersInfo.id;
                param = filtersInfo.param;

                //필수 입력 필터의 경우 항목관리에서 사용자가 메세지를 직접 지정하는 부분이 있어 이렇게 처리
                if (filter == 'isFill') {
                    Response.elmCurrValue = this.Helper.trim(Response.elmCurrValue);
                    Response.elmCurrErrorMsg = this.requireMsgs[elmTarget.id] ? this.requireMsgs[elmTarget.id] : this.msgs['isFill'];
                } else {
                    var msg = Response.elmCurrField.attr(this.ATTR_MSG);

                    if (msg) {
                        Response.elmCurrErrorMsg = msg;
                    } else if (this.Helper.getElmFilterMsg(elmTarget.id, filter)) {
                        Response.elmCurrErrorMsg = this.Helper.getElmFilterMsg(elmTarget.id, filter);
                    } else {
                        Response.elmCurrErrorMsg = this.msgs[filter];
                    }

                }

                //존재하지 않는 필터인 경우 에러코드 반환
                if(this.Filter[filter] === undefined){
                    Response.elmCurrErrorMsg = this.msgs['notMethod'];
                    var result = this.Helper.getResult(Response, this.CODE_FAIL);

                    Response.elmsCurrErrorField.push(result);
                    return Response.elmsCurrErrorField.length - 1;
                }

                //필터 실행
                var result = this.Filter[filter](Response, param);

                if (result == undefined || result.passed === this.CODE_FAIL) {
                    Response.elmsCurrErrorField.push(result);

                    //Debug를 위해 넣어둔 코드(확장형 필터를 잘못 등록해서 return값이 없는 경우를 체크하기 위함)
                    if (result == undefined) {
                        alert('Extension Filter Return error - ' + filter);
                    }

                    return Response.elmsCurrErrorField.length - 1;
                }
            }
        } else {
            var msg = Response.elmCurrErrorMsg;
            Response.elmCurrErrorMsg = msg ? msg : this.msgs['isRegex'];
            var result = this.Filter.isRegex(Response, filter);

            if(result.passed === this.CODE_FAIL){
                Response.elmsCurrErrorField.push(result);

                return Response.elmsCurrErrorField.length - 1;
            }
        }

        return RESULT_SUCCESS;
    }
};

/**
 * FwValidator.Response
 *
 * @package     jquery
 * @subpackage  validator
 */

FwValidator.Response = function() {

    this.formId = null;
    this.elmForm = null;
    this.elmsTarget = null;
    this.elmsCurrErrorField = [];

    this.elmCurrField = null;
    this.elmCurrFieldType = null;
    this.elmCurrFieldDisabled = null;
    this.elmCurrLabel = null;
    this.elmCurrValue = null;
    this.elmCurrFilter = null;
    this.elmCurrErrorMsg = null;

    this.requireMsgs = {};

};

/**
 * FwValidator.Helper
 *
 * @package     jquery
 * @subpackage  validator
 */

FwValidator.Helper = {

    parent : FwValidator,

    /**
     * 메세지 엘리먼트의 아이디 prefix
     */
    msgIdPrefix : 'msg_',

    /**
     * 메세지 엘리먼트의 클래스 명 prefix
     */
    msgClassNamePrefix : 'msg_error_mark_',

    /**
     * 결과 반환
     */
    getResult : function(Response, code, param) {

        //특수 파라미터 정보(특정 필터에서만 사용함)
        param = param != undefined ? param : {};

        var msg = '';

        if (code === this.parent.CODE_FAIL) {

            try {
                msg = Response.elmCurrErrorMsg.replace(/\{label\}/i, Response.elmCurrLabel);
            } catch(e) {
                msg = 'No Message';
            }

        } else {

            msg = 'success';

        }

        var result = {};
        result.passed = code;
        result.formid = Response.formId;
        result.msg = msg;
        result.param = param;

        try {
        result.element = Response.elmCurrField;
        result.elmid = Response.elmCurrField.attr('id');
        result.filter = Response.elmCurrFilter;
        } catch(e) {}

        return result;

    },

    /**
     * 필터 정보 반환(필터이름, 파라미터)
     */
    getFilterInfo : function(filter) {
        var matches = filter.match(/(is[a-z]*)((?:\[.*?\])*)/i);

        return {
            id : matches[1],
            param : this.getFilterParams(matches[2])
        };
    },

    /**
     * 필터의 파라미터 스트링 파싱
     * isFill[a=1][b=1][c=1] 이런식의 멀티 파라미터가 지정되어 있는 경우는 배열로 반환함
     * isFill[a=1] 단일 파라미터는 파라미터로 지정된 스트링값만 반환함
     */
    getFilterParams : function(paramStr) {
        if (paramStr == undefined || paramStr == null || paramStr == '') {
            return '';
        }

        var matches = paramStr.match(/\[.*?\]/ig);

        if (matches == null) {
            return '';
        }

        var count = matches.length;
        var result = [];

        for (var i=0; i < count; i++) {
            var p = matches[i].match(/\[(.*?)\]/);
            result.push(p[1]);
        }

        if (result.length == 1) {
            return result[0];
        }

        return result;
    },

    /**
     * 필드 타입 반환(select, checkbox, radio, textbox)
     */
    getElmType : function(elmField) {
        var $ = this.parent.jQuery;

        elmField = $(elmField);

        var elTag = elmField[0].tagName;
        var result = null;

        switch (elTag) {
            case 'SELECT' :
                result = 'select';
                break;

            case 'INPUT' :
                if ($.fn.prop) {
                    var _type = elmField.prop('type').toLowerCase();
                } else {
                    var _type = elmField.attr('type').toLowerCase();
                }
                if(_type == 'checkbox') result = 'checkbox';
                else if(_type =='radio') result = 'radio';
                else result = 'textbox';

                break;

            case 'TEXTAREA' :
                result = 'textbox';
                break;

            default :
                result = 'textbox';
                break;
        }

        return result;
    },

    /**
     * 필드 값 반환
     */
    getValue : function(formId, elmField) {
        var $ = this.parent.jQuery;
        var result = '';
        var elmName = elmField.attr('name');
        var fieldType = this.getElmType(elmField);

        //checkbox 나 radio 박스는 value값을 반환하지 않음
        if (fieldType == 'checkbox' || fieldType == 'radio') {
            if(elmField.get(0).checked === true){
                result = elmField.val();
            }
            return result;
        }

        //alonefilter 속성이 Y 로 되어 있다면 해당 엘리먼트의 값만 반환함
        var aloneFilter = elmField.attr(this.parent.ATTR_ALONE);
        if(aloneFilter == 'Y' || aloneFilter == 'y'){
            return elmField.val();
        }

        //name이 배열형태로 되어 있다면 값을 모두 합쳐서 반환
        if( /\[.*?\]/.test(elmName) ){
            var formInfo = this.getFormInfo(formId);

            var groupElms = $(formInfo.selector +' [name="'+elmName+'"]');
            groupElms.each(function(i){
                var elm = $(this);
                result += elm.val();
            });
        }else{
            result = elmField.val();
        }

        return result;
    },

    /**
     * 에러메세지 엘리먼트 생성
     */
    createMsg : function(elm, msg, formId) {
        var $ = this.parent.jQuery;
        var elmMsg = document.createElement('span');

        elmMsg.id = this.msgIdPrefix + elm.attr('id');
        elmMsg.className = this.msgClassNamePrefix + formId;
        elmMsg.innerHTML = msg;

        return $(elmMsg);
    },

    /**
     * 에러메세지 엘리먼트 제거
     */
    removeMsg : function(elm) {
        var $ = this.parent.jQuery;
        var id = this.msgIdPrefix + elm.attr('id');
        var elmErr = $('#'+id);

        if (elmErr) elmErr.remove();
    },

    /**
     * 에러메세지 엘리먼트 모두 제거
     */
    removeAllMsg : function(formId) {
        var $ = this.parent.jQuery;
        var className = this.msgClassNamePrefix + formId;

        $('.' + className).remove();
    },

    /**
     * 문자열의 Byte 수 반환
     */
    getByte : function(str) {
        var encode = encodeURIComponent(str);
        var totalBytes = 0;
        var chr;
        var bytes;
        var code;

        for(var i = 0; i < encode.length; i++)
        {
            chr = encode.charAt(i);
            if(chr != "%") totalBytes++;
            else
            {
                code = parseInt(encode.substr(i+1,2),16);
                if(!(code & 0x80)) totalBytes++;
                else
                {
                    if((code & 0xE0) == 0xC0) bytes = 2;
                    else if((code & 0xF0) == 0xE0) bytes = 3;
                    else if((code & 0xF8) == 0xF0) bytes = 4;
                    else return -1;

                    i += 3 * (bytes - 1);

                    totalBytes += 2;
                }
                i += 2;
            }
        }

        return totalBytes;
    },

    /**
     * 지정한 엘리먼트의 필터 메세지가 존재하는가
     *
     * @param elmId (엘리먼트 아이디)
     * @param filter (필터명)
     * @return string | false
     */
    getElmFilterMsg : function(elmId, filter) {
        if (this.parent.elmFilterMsgs[elmId] == undefined) return false;
        if (this.parent.elmFilterMsgs[elmId][filter] == undefined) return false;

        return this.parent.elmFilterMsgs[elmId][filter];
    },

    /**
     * 폼 정보 반환
     *
     * @param formId (폼 아이디 혹은 네임)
     * @return array(
     *   'selector' => 셀렉터 문자,
     *   'instance' => 셀렉터 문법으로 검색해낸 폼 객체
     * ) | false
     */
    getFormInfo : function(formId) {
        var $ = this.parent.jQuery;
        var result = {};
        var selector = '#' + formId;
        var instance = $(selector);

        if (instance.length > 0) {
            result.selector = selector;
            result.instance = instance;

            return result;
        }

        selector = 'form[name="' + formId + '"]';
        instance = $(selector);

        if (instance.length > 0) {
            result.selector = selector;
            result.instance = instance;

            return result;
        }

        return false;
    },

    /**
     * 숫자형태의 문자열로 바꿔줌
     * 123,123,123
     * 123123,123
     * 123%
     * 123  %
     * 123.4
     * -123
     * ,123
     *
     * @param value
     * @return float
     */
    getNumberConv : function(value) {
        if (!value || value == undefined || value == null) return '';

        value = value + "";

        value = value.replace(/,/g, '');
        value = value.replace(/%/g, '');
        value = value.replace(/[\s]/g, '');

        if (this.parent.Verify.isFloat(value) === false) return '';

        return parseFloat(value);
    },

    /**
     * 문자열 앞 뒤 공백 제거
     *
     * @param string text
     * @return string
     */
    trim: function(text) {
        var trim = String.prototype.trim;

        return text == null ? "" : trim.call(text);
    }
};

/**
 * FwValidator.Handler
 *
 * @package     jquery
 * @subpackage  validator
 */

FwValidator.Handler = {

    parent : FwValidator,

    /**
     * 사용자 정의형 에러핸들러(엘리먼트 아이디별로 저장됨)
     */
    customErrorHandler : {},

    /**
     * 사용자 정의형 에러핸들러(필터별로 저장됨)
     */
    customErrorHandlerByFilter : {},

    /**
     * 사용자 정의형 성공핸들러(엘리먼트 아이디별로 저장됨)
     */
    customSuccessHandler : {},

    /**
     * 사용자 정의형 성공핸들러(필터별로 저장됨)
     */
    customSuccessHandlerByFilter : {},

    /**
     * FwValidator._execute에 의해 검사되기 전 실행되는 콜백함수
     */
    beforeExecute : [],

    /**
     * FwValidator._submit에서 바인딩한 onsubmit 이벤트 발생후 실행되는 콜백함수
     * {폼아이디 : 콜백함수, ...}
     */
    beforeSubmit : {},

    /**
     * 기본 메세지 전체를 오버라이딩
     */
    overrideMsgs : function(msgs) {
        if (typeof msgs != 'object') return;

        this.parent.msgs = msgs;
    },

    /**
     * 필드에 따른 필수 입력 에러메세지 설정
     */
    setRequireErrorMsg : function(field, msg) {
        this.parent.requireMsgs[field] = msg;
    },

    /**
     * 필터 타입에 따른 에러메세지 설정
     */
    setFilterErrorMsg : function(filter, msg) {
        this.parent.msgs[filter] = msg;
    },

    /**
     * 엘리먼트의 특정 필터에만 에러메세지를 설정
     */
    setFilterErrorMsgByElement : function(elmId, filter, msg) {
        if (this.parent.elmFilterMsgs[elmId] == undefined) {
            this.parent.elmFilterMsgs[elmId] = {};
        }

        this.parent.elmFilterMsgs[elmId][filter] = msg;
    },

    /**
     * 엘리먼트 아이디별 사용자정의형 에러핸들러 등록
     */
    setCustomErrorHandler : function(elmId, func) {
        if (typeof func != 'function') return;

        this.customErrorHandler[elmId] = func;
    },

    /**
     * 필터 타입별 사용자정의형 에러핸들러 등록
     */
    setCustomErrorHandlerByFilter : function(filter, func) {
        if (typeof func != 'function') return;

        this.customErrorHandlerByFilter[filter] = func;
    },

    /**
     * 엘리먼트 아이디별 사용자정의형 성공핸들러 등록
     */
    setCustomSuccessHandler : function(elmId, func) {
        if (typeof func != 'function') return;

        this.customSuccessHandler[elmId] = func;
    },

    /**
     * 필터 타입별 사용자정의형 성공핸들러 등록
     */
    setCustomSuccessHandlerByFilter : function(filter, func) {
        if (typeof func != 'function') return;

        this.customSuccessHandlerByFilter[filter] = func;
    },

    /**
     * 확장형 필터 등록
     */
    setExtensionFilter : function(filter, func) {
        if (typeof func != 'function') return;

        if (this.parent.Filter[filter] == undefined) {
            this.parent.Filter[filter] = func;
        }
    },

    /**
     * 각 엘리먼트가 FwValidator._execute에 의해 검사되기 전 실행되는 콜백함수 등록
     */
    setBeforeExecute : function(func) {
        if (typeof func != 'function') return;

        this.beforeExecute.push(func);
    },

    /**
     * FwValidator._submit 에서 바인딩된 onsubmit 이벤트의 콜백함수 등록(유효성 검사가 성공하면 호출됨)
     */
    setBeforeSubmit : function(func) {
        if (typeof func != 'function') return;

        this.beforeSubmit = func;
    },

    /**
     * 에러핸들러 - 기본
     */
    errorHandler : function(resultData) {
        if (this._callCustomErrorHandler(resultData) === true) return;

        alert(resultData.msg);
        resultData.element.focus();
    },

    /**
     * 에러핸들러 - 전체 펼침 모드
     */
    errorHandlerByExapnd : function(Response) {
        var count = Response.elmsCurrErrorField.length;

        //해당 폼에 출력된 에러메세지를 일단 모두 지운다.
        this.parent.Helper.removeAllMsg(Response.formId);

        for (var i=0; i < count; ++i) {
            var resultData = Response.elmsCurrErrorField[i];

            if (this._callCustomErrorHandler(resultData) === true) continue;

            var elmMsg = this.parent.Helper.createMsg(resultData.element, resultData.msg, resultData.formid).css({'color':'#FF3300'});
            elmMsg.appendTo(resultData.element.parent());
        }
    },

    /**
     * 에러핸들러 - fireon
     */
    errorHandlerByFireon : function(resultData) {
        if (this._callCustomErrorHandler(resultData) === true) return;

        //해당 항목의 에러메세지 엘리먼트가 있다면 먼저 삭제한다.
        this.parent.Helper.removeMsg(resultData.element);

        var elmMsg = this.parent.Helper.createMsg(resultData.element, resultData.msg, resultData.formid).css({'color':'#FF3300'});
        elmMsg.appendTo(resultData.element.parent());

        return elmMsg;
    },

    /**
     * 성공핸들러 - fireon
     */
    successHandlerByFireon : function(resultData) {

        this._callCustomSuccessHandler(resultData);

    },

    /**
     * 정의형 에러 핸들러 호출
     *
     * @return boolean (정의형 에러핸들러를 호출했을 경우 true 반환)
     */
    _callCustomErrorHandler : function(resultData) {
        //resultData 가 정의되어 있지 않은 경우
        if (resultData == undefined) {
            alert('errorHandler - resultData is not found');
            return true;
        }

        //해당 엘리먼트에 대한 Custom에러핸들러가 등록되어 있다면 탈출
        if (this.customErrorHandler[resultData.elmid] != undefined) {
            this.customErrorHandler[resultData.elmid].call(this.parent, resultData);
            return true;
        }

        //해당 필터에 대한 Custom에러핸들러가 등록되어 있다면 탈출
        if (this.customErrorHandlerByFilter[resultData.filter] != undefined) {
            this.customErrorHandlerByFilter[resultData.filter].call(this.parent, resultData);
            return true;
        }

        return false;
    },

    /**
     * 정의형 성공 핸들러 호출 - 기본적으로 fireon 속성이 적용된 엘리먼트에만 적용됨.
     */
    _callCustomSuccessHandler : function(resultData) {

        if (this.customSuccessHandler[resultData.elmid] != undefined) {
            this.customSuccessHandler[resultData.elmid].call(this.parent, resultData);
            return;
        }

        if (this.customSuccessHandlerByFilter[resultData.filter] != undefined) {
            this.customSuccessHandlerByFilter[resultData.filter].call(this.parent, resultData);
            return;
        }

    }
};

/**
 * FwValidator.Verify
 *
 * @package     jquery
 * @subpackage  validator
 */

FwValidator.Verify = {

    parent : FwValidator,

    isNumber : function(value, cond) {
        if (value == '') return true;

        if (!cond) {
            cond = 1;
        }

        cond = parseInt(cond);

        pos = 1;
        nga = 2;
        minpos = 4;
        minnga = 8;

        result = 0;

        if ((/^[0-9]+$/).test(value) === true) {
            result = pos;
        } else if ((/^[-][0-9]+$/).test(value) === true) {
            result = nga;
        } else if ((/^[0-9]+[.][0-9]+$/).test(value) === true) {
            result = minpos;
        } else if ((/^[-][0-9]+[.][0-9]+$/).test(value) === true) {
            result = minnga;
        }

        if (result & cond) {
            return true;
        }

        return false;
    },

    isFloat : function(value) {
        if (value == '') return true;

        return (/^[\-0-9]([0-9]+[\.]?)*$/).test(value);
    },

    isIdentity : function(value) {
        if (value == '') return true;

        return (/^[a-z]+[a-z0-9_]+$/i).test(value);
    },

    isKorean : function(value) {
        if (value == '') return true;

        var count = value.length;

        for(var i=0; i < count; ++i){
            var cCode = value.charCodeAt(i);

            //공백은 무시
            if(cCode == 0x20) continue;

            if(cCode < 0x80){
                return false;
            }
        }

        return true;
    },

    isAlpha : function(value) {
        if (value == '') return true;

        return (/^[a-z]+$/i).test(value);
    },

    isAlphaUpper : function(value) {
        if (value == '') return true;

        return (/^[A-Z]+$/).test(value);
    },

    isAlphaLower : function(value) {
        if (value == '') return true;

        return (/^[a-z]+$/).test(value);
    },

    isAlphaNum : function(value) {
        if (value == '') return true;

        return (/^[a-z0-9]+$/i).test(value);
    },

    isAlphaSpace : function(value) {
        if (value == '') return true;

        return (/^[a-zA-Z ]+$/).test(value);
    },

    isAlphaNumUpper : function(value) {
        if (value == '') return true;

        return (/^[A-Z0-9]+$/).test(value);
    },

    isAlphaNumLower : function(value) {
        if (value == '') return true;

        return (/^[a-z0-9]+$/).test(value);
    },

    isAlphaDash : function(value) {
        if (value == '') return true;

        return (/^[a-z0-9_-]+$/i).test(value);
    },

    isAlphaDashUpper : function(value) {
        if (value == '') return true;

        return (/^[A-Z0-9_-]+$/).test(value);
    },

    isAlphaDashLower : function(value) {
        if (value == '') return true;

        return (/^[a-z0-9_-]+$/).test(value);
    },

    isSsn : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        if ( (/[0-9]{2}[01]{1}[0-9]{1}[0123]{1}[0-9]{1}[1234]{1}[0-9]{6}$/).test(value) === false ) {
            return false;
        }

        var sum = 0;
        var last = value.charCodeAt(12) - 0x30;
        var bases = "234567892345";
        for (var i=0; i<12; i++) {
            sum += (value.charCodeAt(i) - 0x30) * (bases.charCodeAt(i) - 0x30);
        };
        var mod = sum % 11;

        if ( (11 - mod) % 10 != last ) {
            return false;
        }

        return true;
    },

    isForeignerNo : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        if ( (/[0-9]{2}[01]{1}[0-9]{1}[0123]{1}[0-9]{1}[5678]{1}[0-9]{1}[02468]{1}[0-9]{2}[6789]{1}[0-9]{1}$/).test(value) === false ) {
            return false;
        }

        var sum = 0;
        var last = value.charCodeAt(12) - 0x30;
        var bases = "234567892345";
        for (var i=0; i<12; i++) {
            sum += (value.charCodeAt(i) - 0x30) * (bases.charCodeAt(i) - 0x30);
        };
        var mod = sum % 11;
        if ( (11 - mod + 2) % 10 != last ) {
            return false;
        }

        return true;
    },

    isBizNo : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        if ( (/[0-9]{3}[0-9]{2}[0-9]{5}$/).test(value) === false ) {
            return false;
        }

        var sum = parseInt(value.charAt(0));
        var chkno = [0, 3, 7, 1, 3, 7, 1, 3];
        for (var i = 1; i < 8; i++) {
            sum += (parseInt(value.charAt(i)) * chkno[i]) % 10;
        }
        sum += Math.floor(parseInt(parseInt(value.charAt(8))) * 5 / 10);
        sum += (parseInt(value.charAt(8)) * 5) % 10 + parseInt(value.charAt(9));

        if (sum % 10 != 0) {
            return false;
        }

        return true;
    },

    isJuriNo : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        if ( (/^([0-9]{6})-?([0-9]{7})$/).test(value) === false ) {
            return false;
        }

        var sum = 0;
        var last = parseInt(value.charAt(12), 10);
        for (var i=0; i<12; i++) {
            if (i % 2 == 0) {  // * 1
                sum += parseInt(value.charAt(i), 10);
            } else {    // * 2
                sum += parseInt(value.charAt(i), 10) * 2;
            };
        };

        var mod = sum % 10;
        if( (10 - mod) % 10 != last ){
            return false;
        }

        return true;
    },

    isPhone : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        return (/^(02|0[0-9]{2,3})[1-9]{1}[0-9]{2,3}[0-9]{4}$/).test(value);
    },

    isMobile : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        return (/^01[016789][1-9]{1}[0-9]{2,3}[0-9]{4}$/).test(value);
    },

    isZipcode : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        return (/^[0-9]{3}[0-9]{3}$/).test(value);
    },

    isIp : function(value) {
        if (value == '') return true;

        return (/^([1-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){2,}$/).test(value);
    },

    isEmail : function(value) {
        value = this.parent.Helper.trim(value);
        if (value == '') return true;

        return (/^([a-z0-9\_\-\.]+)@([a-z0-9\_\-]+\.)+[a-z]{2,63}$/i).test(value);
    },

    isUrl : function(value) {
        if (value == '') return true;

        return (/http[s]?:\/\/[a-z0-9_\-]+(\.[a-z0-9_\-]+)+/i).test(value);
    },

    isDate : function(value) {
        value = value.replace(/-/g, '');
        if (value == '') return true;

        return (/^[12][0-9]{3}(([0]?[1-9])|([1][012]))[0-3]?[0-9]$/).test(value);
    },

    isPassport : function(value) {
        if (value == '') return true;

        //일반 여권
        if ( (/^[A-Z]{2}[0-9]{7}$/).test(value) === true ) {
            return true;
        }

        //전자 여권
        if ( (/^[A-Z]{1}[0-9]{8}$/).test(value) === true ) {
            return true;
        }

        return false;
    },

    isNumberMin : function(value, limit) {
        value = this.parent.Helper.getNumberConv(value);
        limit = this.parent.Helper.getNumberConv(limit);

        if (value < limit) {
            return false;
        }

        return true;
    },

    isNumberMax : function(value, limit) {
        value = this.parent.Helper.getNumberConv(value);
        limit = this.parent.Helper.getNumberConv(limit);

        if (value > limit) {
            return false;
        }

        return true;
    },

    isNumberRange : function(value, min, max) {
        value = this.parent.Helper.getNumberConv(value);

        min = this.parent.Helper.getNumberConv(min);
        max = this.parent.Helper.getNumberConv(max);

        if (value < min || value > max) {
            return false;
        }

        return true;
    }
};

/**
 * FwValidator.Filter
 *
 * @package     jquery
 * @subpackage  validator
 */

FwValidator.Filter = {

    parent : FwValidator,

    isFill : function(Response, cond) {
        if (typeof cond != 'string') {
            var count = cond.length;
            var result = this.parent.Helper.getResult(Response, parent.CODE_SUCCESS);

            for (var i = 0; i < count; ++i) {
                result = this._fillConditionCheck(Response, cond[i]);

                if (result.passed === true) {
                    return result;
                }
            }

            return result;
        }

        return this._fillConditionCheck(Response, cond);
    },

    isMatch : function(Response, sField) {
        var $ = this.parent.jQuery;

        if(Response.elmCurrValue == ''){
            return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
        }

        //Radio 나 Checkbox의 경우 무시
        if(Response.elmCurrFieldType == 'radio' || Response.elmCurrFieldType == 'checkbox'){
            return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
        }

        var elmTarget = $('#'+sField);
        var elmTargetValue = elmTarget.val();

        if (Response.elmCurrValue != elmTargetValue) {
            var label = elmTarget.attr(this.parent.ATTR_LABEL);
            var match = label ? label : sField;

            Response.elmCurrErrorMsg = Response.elmCurrErrorMsg.replace(/\{match\}/i, match);

            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isMax : function(Response, iLen) {
        var $ = this.parent.jQuery;
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        if (Response.elmCurrFieldType == 'radio' || Response.elmCurrFieldType == 'checkbox') {
            var chkCount = 0;
            var sName = Response.elmCurrField.attr('name');

            $('input[name="'+sName+'"]').each(function(i){
                if ($(this).get(0).checked === true) {
                    ++chkCount;
                }
            });

            if (chkCount > iLen) {
                result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            }

        } else {
            var len = Response.elmCurrValue.length;

            if (len > iLen) {
                result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            }
        }

        if (result.passed === this.parent.CODE_FAIL) {
            result.msg = result.msg.replace(/\{max\}/i, iLen);
        }

        return result;
    },

    isMin : function(Response, iLen) {
        var $ = this.parent.jQuery;
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        if(Response.elmCurrFieldType == 'radio' || Response.elmCurrFieldType == 'checkbox'){
            var chkCount = 0;
            var sName = Response.elmCurrField.attr('name');

            $('input[name="'+sName+'"]').each(function(i){
                if($(this).get(0).checked === true){
                    ++chkCount;
                }
            });

            if (chkCount < iLen) {
                result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            }

        }else{
            var len = Response.elmCurrValue.length;

            if(len < iLen){
                result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            }
        }

        if(result.passed === this.parent.CODE_FAIL){
            result.msg = result.msg.replace(/\{min\}/i, iLen);
        }

        return result;
    },

    isNumber : function(Response, iCond) {
        var result = this.parent.Verify.isNumber(Response.elmCurrValue, iCond);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isIdentity : function(Response){
        var result = this.parent.Verify.isIdentity(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isKorean : function(Response){
        var result = this.parent.Verify.isKorean(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlpha : function(Response){
        var result = this.parent.Verify.isAlpha(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaLower : function(Response){
        var result = this.parent.Verify.isAlphaLower(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },


    isAlphaSpace : function(Response){
        var result = this.parent.Verify.isAlphaSpace(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaUpper : function(Response){
        var result = this.parent.Verify.isAlphaUpper(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaNum : function(Response){
        var result = this.parent.Verify.isAlphaNum(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaNumLower : function(Response){
        var result = this.parent.Verify.isAlphaNumLower(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaNumUpper : function(Response){
        var result = this.parent.Verify.isAlphaNumUpper(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaDash : function(Response){
        var result = this.parent.Verify.isAlphaDash(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaDashLower : function(Response){
        var result = this.parent.Verify.isAlphaDashLower(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isAlphaDashUpper : function(Response){
        var result = this.parent.Verify.isAlphaDashUpper(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isSsn : function(Response){
        var result = this.parent.Verify.isSsn(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isForeignerNo : function(Response){
        var result = this.parent.Verify.isForeignerNo(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isBizNo : function(Response){
        var result = this.parent.Verify.isBizNo(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isJuriNo : function(Response){
        var result = this.parent.Verify.isJuriNo(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isPhone : function(Response){
        var result = this.parent.Verify.isPhone(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isMobile : function(Response){
        var result = this.parent.Verify.isMobile(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isZipcode : function(Response){
        var result = this.parent.Verify.isZipcode(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isIp : function(Response){
        var result = this.parent.Verify.isIp(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isEmail : function(Response){
        var result = this.parent.Verify.isEmail(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isUrl : function(Response){
        var result = this.parent.Verify.isUrl(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isDate : function(Response){
        var result = this.parent.Verify.isDate(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isRegex : function(Response, regex){
        regex = eval(regex);

        if( regex.test(Response.elmCurrValue) === false ){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isPassport : function(Response){
        var result = this.parent.Verify.isPassport(Response.elmCurrValue);

        if(result === false){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);
    },

    isSimplexEditorFill : function(Response){

        var result = eval(Response.elmCurrValue + ".isEmptyContent();");

        if(result === true){
            return this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
        }

        return this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

    },

    isMaxByte : function(Response, iLen) {
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        var len = this.parent.Helper.getByte(Response.elmCurrValue);

        if (len > iLen) {
            result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            result.msg = result.msg.replace(/\{max\}/i, iLen);
        }

        return result;
    },

    isMinByte : function(Response, iLen) {
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        var len = this.parent.Helper.getByte(Response.elmCurrValue);

        if (len < iLen) {
            result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            result.msg = result.msg.replace(/\{min\}/i, iLen);
        }

        return result;
    },

    isByteRange : function(Response, range) {
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        var rangeInfo = this._getRangeNum(range);
        var iMin = rangeInfo.min;
        var iMax = rangeInfo.max;

        var len = this.parent.Helper.getByte(Response.elmCurrValue);

        if (len < iMin || len > iMax) {
            result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            result.msg = result.msg.replace(/\{min\}/i, iMin);
            result.msg = result.msg.replace(/\{max\}/i, iMax);
        }

        return result;
    },

    isLengthRange : function(Response, range) {
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        var rangeInfo = this._getRangeNum(range);
        var iMin = rangeInfo.min;
        var iMax = rangeInfo.max;

        var resultMin = this.isMin(Response, iMin);
        var resultMax = this.isMax(Response, iMax);

        if (resultMin.passed === this.parent.CODE_FAIL || resultMax.passed === this.parent.CODE_FAIL) {
            result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            result.msg = result.msg.replace(/\{min\}/i, iMin);
            result.msg = result.msg.replace(/\{max\}/i, iMax);
        }

        return result;
    },

    isNumberMin : function(Response, iLimit) {
        var check = this.parent.Verify.isNumberMin(Response.elmCurrValue, iLimit);
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        if(check === false){
            result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            result.msg = result.msg.replace(/\{min\}/i, iLimit);
        }

        return result;
    },

    isNumberMax : function(Response, iLimit) {
        var check = this.parent.Verify.isNumberMax(Response.elmCurrValue, iLimit);
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        if(check === false){
            result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            result.msg = result.msg.replace(/\{max\}/i, iLimit);
        }

        return result;
    },

    isNumberRange : function(Response, range) {
        var iMin = range[0];
        var iMax = range[1];

        var check = this.parent.Verify.isNumberRange(Response.elmCurrValue, iMin, iMax);
        var result = this.parent.Helper.getResult(Response, this.parent.CODE_SUCCESS);

        if(check === false){
            result = this.parent.Helper.getResult(Response, this.parent.CODE_FAIL);
            result.msg = result.msg.replace(/\{min\}/i, iMin);
            result.msg = result.msg.replace(/\{max\}/i, iMax);
        }

        return result;
    },

    _getRangeNum : function(range) {
        var result = {};

        result.min = range[0] <= 0 ? 0 : parseInt(range[0]);
        result.max = range[1] <= 0 ? 0 : parseInt(range[1]);

        return result;
    },

    _fillConditionCheck : function(Response, cond) {
        var $ = this.parent.jQuery;
        var parent = this.parent;


        cond = parent.Helper.trim(cond);

        //조건식이 들어오면 조건식에 맞을 경우만 필수값을 체크함
        if (cond) {
            var conditions = cond.split('=');
            var fieldId = parent.Helper.trim(conditions[0]);
            var fieldVal = parent.Helper.trim(conditions[1]);

            try {
                var val = parent.Helper.getValue(Response.formId, $('#'+fieldId));
                val = parent.Helper.trim(val);

                if(fieldVal != val) {
                    return parent.Helper.getResult(Response, parent.CODE_SUCCESS);
                }
            } catch(e) {
                if (parent.DEBUG_MODE == true) {
                    Response.elmCurrErrorMsg = parent.msgs['isFillError'];
                    Response.elmCurrErrorMsg = Response.elmCurrErrorMsg.replace(/\{condition\}/i, cond);
                    return parent.Helper.getResult(Response, parent.CODE_FAIL);
                }

                return parent.Helper.getResult(Response, parent.CODE_SUCCESS);
            }
        }

        //Radio 나 Checkbox의 경우 선택한값이 있는지 여부를 체크함
        if (Response.elmCurrFieldType == 'radio' || Response.elmCurrFieldType == 'checkbox') {

            var sName = Response.elmCurrField.attr('name');
            var result = parent.Helper.getResult(Response, parent.CODE_FAIL);

            $('input[name="'+sName+'"]').each(function(i){
                if ($(this).get(0).checked === true) {
                    result = parent.Helper.getResult(Response, parent.CODE_SUCCESS);
                }
            });

            return result;

        }

        //일반 텍스트 박스
        if (Response.elmCurrValue != '') {
            return parent.Helper.getResult(Response, parent.CODE_SUCCESS);
        }

        return parent.Helper.getResult(Response, parent.CODE_FAIL);
    }
};

FwValidator.msgs = {

    //기본
    'isFill' : '{label} 항목은 필수 입력값입니다.',

    'isNumber' : '{label} 항목이 숫자 형식이 아닙니다.',

    'isEmail' : '{label} 항목이 이메일 형식이 아닙니다.',

    'isIdentity' : '{label} 항목이 아이디 형식이 아닙니다.',

    'isMax' : '{label} 을(를) {max}자 이하로 입력해주세요.',

    'isMin' : '{label} 항목이 {min}자(개) 이상으로 해주십시오 .',

    'isRegex' : '{label} 항목이 올바른 입력값이 아닙니다.',

    'isAlpha' : '{label} 항목이 영문이 아닙니다',

    'isAlphaLower' : '{label} 항목이 영문 소문자 형식이 아닙니다',

    'isAlphaUpper' : '{label} 항목이 영문 대문자 형식이 아닙니다',

    'isAlphaNum' : '{label} 항목이 영문이나 숫자 형식이 아닙니다.',

    'isAlphaNumLower' : '{label} 항목이 영문 소문자 혹은 숫자 형식이 아닙니다.',

    'isAlphaNumUpper' : '{label} 항목이 영문 대문자 혹은 숫자 형식이 아닙니다.',

    'isAlphaSpace' : '{label} 항목이 영문이 아닙니다',

    'isAlphaDash' : '{label} 항목이 [영문,숫자,_,-] 형식이 아닙니다.',

    'isAlphaDashLower' : '{label} 항목이 [영문 소문자,숫자,_,-] 형식이 아닙니다.',

    'isAlphaDashUpper' : '{label} 항목이 [영문 대문자,숫자,_,-] 형식이 아닙니다.',

    'isKorean' : '{label} 항목이 한국어 형식이 아닙니다.',

    'isUrl' : '{label} 항목이 URL 형식이 아닙니다.',

    'isSsn' : '{label} 항목이 주민등록번호 형식이 아닙니다.',

    'isForeignerNo' : '{label} 항목이 외국인등록번호 형식이 아닙니다.',

    'isBizNo' : '{label} 항목이 사업자번호 형식이 아닙니다.',

    'isPhone' : '{label} 항목이 전화번호 형식이 아닙니다.',

    'isMobile' : '{label} 항목이 핸드폰 형식이 아닙니다.',

    'isZipcode' : '{label} 항목이 우편번호 형식이 아닙니다.',

    'isJuriNo' : '{label} 항목이 법인번호 형식이 아닙니다.',

    'isIp' : '{label} 항목이 아이피 형식이 아닙니다.',

    'isDate' : '{label} 항목이 날짜 형식이 아닙니다.',

    'isMatch' : '{label} 항목과 {match} 항목이 같지 않습니다.',

    'isSuccess' : '{label} 항목의 데이터는 전송할 수 없습니다.',

    'isSimplexEditorFill' : '{label}(을/를) 입력하세요',

    'isPassport' : '{label} 항목이 여권번호 형식이 아닙니다.',

    'isMaxByte' : '{label} 항목은 {max}bytes 이하로 해주십시오.',

    'isMinByte' : '{label} 항목은 {min}bytes 이상으로 해주십시오.',

    'isByteRange' : '{label} 항목은 {min} ~ {max}bytes 범위로 해주십시오.',

    'isLengthRange' : '{label} 항목은 {min} ~ {max}자(개) 범위로 해주십시오.',

    'isNumberMin' : '{label} 항목은 {min} 이상으로 해주십시오.',

    'isNumberMax' : '{label} 항목은 {max} 이하로 해주십시오.',

    'isNumberRange' : '{label} 항목은 {min} ~ {max} 범위로 해주세요.',


    //디버깅
    'notMethod' : '{label} 항목에 존재하지 않는 필터를 사용했습니다.',

    'isFillError' : "[{label}] 필드의 isFill {condition} 문장이 잘못되었습니다.\r\n해당 필드의 아이디를 확인하세요."

};

FwValidator.Handler.overrideMsgs({

    //기본
    'isFill' : sprintf(__('IS.REQUIRED.FIELD', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isNumber' : sprintf(__('MAY.ONLY.CONTAIN.NUMBERS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isEmail' : sprintf(__('VALID.EMAIL.ADDRESS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isIdentity' : sprintf(__('FIELD.CORRECT.ID.FORMAT', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isMax' : sprintf(__('EXCEED.CHARACTERS.LENGTH', 'RESOUCE.JS.VALIDATOR'), '{label}', '{max}'),

    'isMin' : sprintf(__('MUST.AT.LEAST.CHARACTERS', 'RESOUCE.JS.VALIDATOR'), '{label}', '{min}'),

    'isRegex' : sprintf(__('FIELD.IN.CORRECT.FORMAT', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlpha' : sprintf(__('ALPHABETICAL.CHARACTERS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaLower' : sprintf(__('CONTAIN.LOWERCASE.LETTERS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaUpper' : sprintf(__('CONTAIN.UPPERCASE.LETTERS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaNum' : sprintf(__('ALPHANUMERIC.CHARACTERS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaNumLower' : sprintf(__('CONTAIN.LOWERCASE.LETTERS.001', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaNumUpper' : sprintf(__('CONTAIN.UPPERCASE.LETTERS.001', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaSpace' : sprintf(__('ALPHABETICAL.CHARACTERS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaDash' : sprintf(__('UNDERSCORES.DASHES', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaDashLower' : sprintf(__('UNDERSCORES.DASHES.001', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isAlphaDashUpper' : sprintf(__('UNDERSCORES.DASHES.002', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isKorean' : sprintf(__('CONTAIN.KOREAN.CHARACTERS', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isUrl' : sprintf(__('MUST.CONTAIN.VALID.URL', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isSsn' : sprintf(__('MUST.CONTAIN.VALID.SSN', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isForeignerNo' : sprintf(__('ALIEN.REGISTRATION.NUMBER', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isBizNo' : sprintf(__('REGISTRATION.NUMBER', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isPhone' : sprintf(__('VALID.PHONE.NUMBER', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isMobile' : sprintf(__('VALID.MOBILE.PHONE.NUMBER', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isZipcode' : sprintf(__('CONTAIN.VALID.ZIP.CODE', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isJuriNo' : sprintf(__('CORPORATE.IDENTITY.NUMBER', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isIp' : sprintf(__('MUST.CONTAIN.VALID.IP', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isDate' : sprintf(__('MUST.CONTAIN.VALID.DATE', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isMatch' : sprintf(__('THE.FIELD.DOES.NOT.MATCH', 'RESOUCE.JS.VALIDATOR'), '{label}', '{match}'),

    'isSuccess' : sprintf(__('THE.DATA.BE.TRANSFERRED', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isSimplexEditorFill' : sprintf(__('THE.FIELD.MUST.HAVE.VALUE', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isPassport' : sprintf(__('VALID.PASSPORT.NUMBER', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isMaxByte' : sprintf(__('VALUE.CAN.NOT.EXCEED', 'RESOUCE.JS.VALIDATOR'), '{label}', '{max}'),

    'isMinByte' : sprintf(__('THE.FIELD.VALUE.MUST.BE', 'RESOUCE.JS.VALIDATOR'), '{label}', '{min}'),

    'isByteRange' : sprintf(__('THE.FIELD.VALUE.MUST.BE.001', 'RESOUCE.JS.VALIDATOR'), '{label}', '{min}', '{max}'),

    'isLengthRange' : sprintf(__('MUST.CHARACTERS.LENGTH', 'RESOUCE.JS.VALIDATOR'), '{label}', '{min}', '{max}'),

    'isNumberMin' : sprintf(__('THE.FIELD.VALUE.MUST.BE.002', 'RESOUCE.JS.VALIDATOR'), '{label}', '{min}'),

    'isNumberMax' : sprintf(__('VALUE.CAN.NOT.EXCEED.001', 'RESOUCE.JS.VALIDATOR'), '{label}', '{max}'),

    'isNumberRange' : sprintf(__('THE.FIELD.VALUE.MUST.BE.003', 'RESOUCE.JS.VALIDATOR'), '{label}', '{min}', '{max}'),


    //디버깅
    'notMethod' : sprintf(__('FILTER.WAS.USED.FIELD', 'RESOUCE.JS.VALIDATOR'), '{label}'),

    'isFillError' : sprintf(__('SENTENCE.INCORRECT.PLEASE', 'RESOUCE.JS.VALIDATOR'), '{label}', '{condition}')

});
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.moment=t()}(this,function(){"use strict";var e,i;function c(){return e.apply(null,arguments)}function o(e){return e instanceof Array||"[object Array]"===Object.prototype.toString.call(e)}function u(e){return null!=e&&"[object Object]"===Object.prototype.toString.call(e)}function l(e){return void 0===e}function h(e){return"number"==typeof e||"[object Number]"===Object.prototype.toString.call(e)}function d(e){return e instanceof Date||"[object Date]"===Object.prototype.toString.call(e)}function f(e,t){var n,s=[];for(n=0;n<e.length;++n)s.push(t(e[n],n));return s}function m(e,t){return Object.prototype.hasOwnProperty.call(e,t)}function _(e,t){for(var n in t)m(t,n)&&(e[n]=t[n]);return m(t,"toString")&&(e.toString=t.toString),m(t,"valueOf")&&(e.valueOf=t.valueOf),e}function y(e,t,n,s){return Tt(e,t,n,s,!0).utc()}function g(e){return null==e._pf&&(e._pf={empty:!1,unusedTokens:[],unusedInput:[],overflow:-2,charsLeftOver:0,nullInput:!1,invalidMonth:null,invalidFormat:!1,userInvalidated:!1,iso:!1,parsedDateParts:[],meridiem:null,rfc2822:!1,weekdayMismatch:!1}),e._pf}function v(e){if(null==e._isValid){var t=g(e),n=i.call(t.parsedDateParts,function(e){return null!=e}),s=!isNaN(e._d.getTime())&&t.overflow<0&&!t.empty&&!t.invalidMonth&&!t.invalidWeekday&&!t.weekdayMismatch&&!t.nullInput&&!t.invalidFormat&&!t.userInvalidated&&(!t.meridiem||t.meridiem&&n);if(e._strict&&(s=s&&0===t.charsLeftOver&&0===t.unusedTokens.length&&void 0===t.bigHour),null!=Object.isFrozen&&Object.isFrozen(e))return s;e._isValid=s}return e._isValid}function p(e){var t=y(NaN);return null!=e?_(g(t),e):g(t).userInvalidated=!0,t}i=Array.prototype.some?Array.prototype.some:function(e){for(var t=Object(this),n=t.length>>>0,s=0;s<n;s++)if(s in t&&e.call(this,t[s],s,t))return!0;return!1};var r=c.momentProperties=[];function w(e,t){var n,s,i;if(l(t._isAMomentObject)||(e._isAMomentObject=t._isAMomentObject),l(t._i)||(e._i=t._i),l(t._f)||(e._f=t._f),l(t._l)||(e._l=t._l),l(t._strict)||(e._strict=t._strict),l(t._tzm)||(e._tzm=t._tzm),l(t._isUTC)||(e._isUTC=t._isUTC),l(t._offset)||(e._offset=t._offset),l(t._pf)||(e._pf=g(t)),l(t._locale)||(e._locale=t._locale),0<r.length)for(n=0;n<r.length;n++)l(i=t[s=r[n]])||(e[s]=i);return e}var t=!1;function M(e){w(this,e),this._d=new Date(null!=e._d?e._d.getTime():NaN),this.isValid()||(this._d=new Date(NaN)),!1===t&&(t=!0,c.updateOffset(this),t=!1)}function k(e){return e instanceof M||null!=e&&null!=e._isAMomentObject}function S(e){return e<0?Math.ceil(e)||0:Math.floor(e)}function D(e){var t=+e,n=0;return 0!==t&&isFinite(t)&&(n=S(t)),n}function a(e,t,n){var s,i=Math.min(e.length,t.length),r=Math.abs(e.length-t.length),a=0;for(s=0;s<i;s++)(n&&e[s]!==t[s]||!n&&D(e[s])!==D(t[s]))&&a++;return a+r}function Y(e){!1===c.suppressDeprecationWarnings&&"undefined"!=typeof console&&console.warn&&console.warn("Deprecation warning: "+e)}function n(i,r){var a=!0;return _(function(){if(null!=c.deprecationHandler&&c.deprecationHandler(null,i),a){for(var e,t=[],n=0;n<arguments.length;n++){if(e="","object"==typeof arguments[n]){for(var s in e+="\n["+n+"] ",arguments[0])e+=s+": "+arguments[0][s]+", ";e=e.slice(0,-2)}else e=arguments[n];t.push(e)}Y(i+"\nArguments: "+Array.prototype.slice.call(t).join("")+"\n"+(new Error).stack),a=!1}return r.apply(this,arguments)},r)}var s,O={};function T(e,t){null!=c.deprecationHandler&&c.deprecationHandler(e,t),O[e]||(Y(t),O[e]=!0)}function b(e){return e instanceof Function||"[object Function]"===Object.prototype.toString.call(e)}function x(e,t){var n,s=_({},e);for(n in t)m(t,n)&&(u(e[n])&&u(t[n])?(s[n]={},_(s[n],e[n]),_(s[n],t[n])):null!=t[n]?s[n]=t[n]:delete s[n]);for(n in e)m(e,n)&&!m(t,n)&&u(e[n])&&(s[n]=_({},s[n]));return s}function P(e){null!=e&&this.set(e)}c.suppressDeprecationWarnings=!1,c.deprecationHandler=null,s=Object.keys?Object.keys:function(e){var t,n=[];for(t in e)m(e,t)&&n.push(t);return n};var W={};function C(e,t){var n=e.toLowerCase();W[n]=W[n+"s"]=W[t]=e}function H(e){return"string"==typeof e?W[e]||W[e.toLowerCase()]:void 0}function R(e){var t,n,s={};for(n in e)m(e,n)&&(t=H(n))&&(s[t]=e[n]);return s}var U={};function F(e,t){U[e]=t}function L(e,t,n){var s=""+Math.abs(e),i=t-s.length;return(0<=e?n?"+":"":"-")+Math.pow(10,Math.max(0,i)).toString().substr(1)+s}var N=/(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g,G=/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g,V={},E={};function I(e,t,n,s){var i=s;"string"==typeof s&&(i=function(){return this[s]()}),e&&(E[e]=i),t&&(E[t[0]]=function(){return L(i.apply(this,arguments),t[1],t[2])}),n&&(E[n]=function(){return this.localeData().ordinal(i.apply(this,arguments),e)})}function A(e,t){return e.isValid()?(t=j(t,e.localeData()),V[t]=V[t]||function(s){var e,i,t,r=s.match(N);for(e=0,i=r.length;e<i;e++)E[r[e]]?r[e]=E[r[e]]:r[e]=(t=r[e]).match(/\[[\s\S]/)?t.replace(/^\[|\]$/g,""):t.replace(/\\/g,"");return function(e){var t,n="";for(t=0;t<i;t++)n+=b(r[t])?r[t].call(e,s):r[t];return n}}(t),V[t](e)):e.localeData().invalidDate()}function j(e,t){var n=5;function s(e){return t.longDateFormat(e)||e}for(G.lastIndex=0;0<=n&&G.test(e);)e=e.replace(G,s),G.lastIndex=0,n-=1;return e}var Z=/\d/,z=/\d\d/,$=/\d{3}/,q=/\d{4}/,J=/[+-]?\d{6}/,B=/\d\d?/,Q=/\d\d\d\d?/,X=/\d\d\d\d\d\d?/,K=/\d{1,3}/,ee=/\d{1,4}/,te=/[+-]?\d{1,6}/,ne=/\d+/,se=/[+-]?\d+/,ie=/Z|[+-]\d\d:?\d\d/gi,re=/Z|[+-]\d\d(?::?\d\d)?/gi,ae=/[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i,oe={};function ue(e,n,s){oe[e]=b(n)?n:function(e,t){return e&&s?s:n}}function le(e,t){return m(oe,e)?oe[e](t._strict,t._locale):new RegExp(he(e.replace("\\","").replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g,function(e,t,n,s,i){return t||n||s||i})))}function he(e){return e.replace(/[-\/\\^$*+?.()|[\]{}]/g,"\\$&")}var de={};function ce(e,n){var t,s=n;for("string"==typeof e&&(e=[e]),h(n)&&(s=function(e,t){t[n]=D(e)}),t=0;t<e.length;t++)de[e[t]]=s}function fe(e,i){ce(e,function(e,t,n,s){n._w=n._w||{},i(e,n._w,n,s)})}var me=0,_e=1,ye=2,ge=3,ve=4,pe=5,we=6,Me=7,ke=8;function Se(e){return De(e)?366:365}function De(e){return e%4==0&&e%100!=0||e%400==0}I("Y",0,0,function(){var e=this.year();return e<=9999?""+e:"+"+e}),I(0,["YY",2],0,function(){return this.year()%100}),I(0,["YYYY",4],0,"year"),I(0,["YYYYY",5],0,"year"),I(0,["YYYYYY",6,!0],0,"year"),C("year","y"),F("year",1),ue("Y",se),ue("YY",B,z),ue("YYYY",ee,q),ue("YYYYY",te,J),ue("YYYYYY",te,J),ce(["YYYYY","YYYYYY"],me),ce("YYYY",function(e,t){t[me]=2===e.length?c.parseTwoDigitYear(e):D(e)}),ce("YY",function(e,t){t[me]=c.parseTwoDigitYear(e)}),ce("Y",function(e,t){t[me]=parseInt(e,10)}),c.parseTwoDigitYear=function(e){return D(e)+(68<D(e)?1900:2e3)};var Ye,Oe=Te("FullYear",!0);function Te(t,n){return function(e){return null!=e?(xe(this,t,e),c.updateOffset(this,n),this):be(this,t)}}function be(e,t){return e.isValid()?e._d["get"+(e._isUTC?"UTC":"")+t]():NaN}function xe(e,t,n){e.isValid()&&!isNaN(n)&&("FullYear"===t&&De(e.year())&&1===e.month()&&29===e.date()?e._d["set"+(e._isUTC?"UTC":"")+t](n,e.month(),Pe(n,e.month())):e._d["set"+(e._isUTC?"UTC":"")+t](n))}function Pe(e,t){if(isNaN(e)||isNaN(t))return NaN;var n,s=(t%(n=12)+n)%n;return e+=(t-s)/12,1===s?De(e)?29:28:31-s%7%2}Ye=Array.prototype.indexOf?Array.prototype.indexOf:function(e){var t;for(t=0;t<this.length;++t)if(this[t]===e)return t;return-1},I("M",["MM",2],"Mo",function(){return this.month()+1}),I("MMM",0,0,function(e){return this.localeData().monthsShort(this,e)}),I("MMMM",0,0,function(e){return this.localeData().months(this,e)}),C("month","M"),F("month",8),ue("M",B),ue("MM",B,z),ue("MMM",function(e,t){return t.monthsShortRegex(e)}),ue("MMMM",function(e,t){return t.monthsRegex(e)}),ce(["M","MM"],function(e,t){t[_e]=D(e)-1}),ce(["MMM","MMMM"],function(e,t,n,s){var i=n._locale.monthsParse(e,s,n._strict);null!=i?t[_e]=i:g(n).invalidMonth=e});var We=/D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/,Ce="January_February_March_April_May_June_July_August_September_October_November_December".split("_");var He="Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_");function Re(e,t){var n;if(!e.isValid())return e;if("string"==typeof t)if(/^\d+$/.test(t))t=D(t);else if(!h(t=e.localeData().monthsParse(t)))return e;return n=Math.min(e.date(),Pe(e.year(),t)),e._d["set"+(e._isUTC?"UTC":"")+"Month"](t,n),e}function Ue(e){return null!=e?(Re(this,e),c.updateOffset(this,!0),this):be(this,"Month")}var Fe=ae;var Le=ae;function Ne(){function e(e,t){return t.length-e.length}var t,n,s=[],i=[],r=[];for(t=0;t<12;t++)n=y([2e3,t]),s.push(this.monthsShort(n,"")),i.push(this.months(n,"")),r.push(this.months(n,"")),r.push(this.monthsShort(n,""));for(s.sort(e),i.sort(e),r.sort(e),t=0;t<12;t++)s[t]=he(s[t]),i[t]=he(i[t]);for(t=0;t<24;t++)r[t]=he(r[t]);this._monthsRegex=new RegExp("^("+r.join("|")+")","i"),this._monthsShortRegex=this._monthsRegex,this._monthsStrictRegex=new RegExp("^("+i.join("|")+")","i"),this._monthsShortStrictRegex=new RegExp("^("+s.join("|")+")","i")}function Ge(e){var t;if(e<100&&0<=e){var n=Array.prototype.slice.call(arguments);n[0]=e+400,t=new Date(Date.UTC.apply(null,n)),isFinite(t.getUTCFullYear())&&t.setUTCFullYear(e)}else t=new Date(Date.UTC.apply(null,arguments));return t}function Ve(e,t,n){var s=7+t-n;return-((7+Ge(e,0,s).getUTCDay()-t)%7)+s-1}function Ee(e,t,n,s,i){var r,a,o=1+7*(t-1)+(7+n-s)%7+Ve(e,s,i);return a=o<=0?Se(r=e-1)+o:o>Se(e)?(r=e+1,o-Se(e)):(r=e,o),{year:r,dayOfYear:a}}function Ie(e,t,n){var s,i,r=Ve(e.year(),t,n),a=Math.floor((e.dayOfYear()-r-1)/7)+1;return a<1?s=a+Ae(i=e.year()-1,t,n):a>Ae(e.year(),t,n)?(s=a-Ae(e.year(),t,n),i=e.year()+1):(i=e.year(),s=a),{week:s,year:i}}function Ae(e,t,n){var s=Ve(e,t,n),i=Ve(e+1,t,n);return(Se(e)-s+i)/7}I("w",["ww",2],"wo","week"),I("W",["WW",2],"Wo","isoWeek"),C("week","w"),C("isoWeek","W"),F("week",5),F("isoWeek",5),ue("w",B),ue("ww",B,z),ue("W",B),ue("WW",B,z),fe(["w","ww","W","WW"],function(e,t,n,s){t[s.substr(0,1)]=D(e)});function je(e,t){return e.slice(t,7).concat(e.slice(0,t))}I("d",0,"do","day"),I("dd",0,0,function(e){return this.localeData().weekdaysMin(this,e)}),I("ddd",0,0,function(e){return this.localeData().weekdaysShort(this,e)}),I("dddd",0,0,function(e){return this.localeData().weekdays(this,e)}),I("e",0,0,"weekday"),I("E",0,0,"isoWeekday"),C("day","d"),C("weekday","e"),C("isoWeekday","E"),F("day",11),F("weekday",11),F("isoWeekday",11),ue("d",B),ue("e",B),ue("E",B),ue("dd",function(e,t){return t.weekdaysMinRegex(e)}),ue("ddd",function(e,t){return t.weekdaysShortRegex(e)}),ue("dddd",function(e,t){return t.weekdaysRegex(e)}),fe(["dd","ddd","dddd"],function(e,t,n,s){var i=n._locale.weekdaysParse(e,s,n._strict);null!=i?t.d=i:g(n).invalidWeekday=e}),fe(["d","e","E"],function(e,t,n,s){t[s]=D(e)});var Ze="Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_");var ze="Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_");var $e="Su_Mo_Tu_We_Th_Fr_Sa".split("_");var qe=ae;var Je=ae;var Be=ae;function Qe(){function e(e,t){return t.length-e.length}var t,n,s,i,r,a=[],o=[],u=[],l=[];for(t=0;t<7;t++)n=y([2e3,1]).day(t),s=this.weekdaysMin(n,""),i=this.weekdaysShort(n,""),r=this.weekdays(n,""),a.push(s),o.push(i),u.push(r),l.push(s),l.push(i),l.push(r);for(a.sort(e),o.sort(e),u.sort(e),l.sort(e),t=0;t<7;t++)o[t]=he(o[t]),u[t]=he(u[t]),l[t]=he(l[t]);this._weekdaysRegex=new RegExp("^("+l.join("|")+")","i"),this._weekdaysShortRegex=this._weekdaysRegex,this._weekdaysMinRegex=this._weekdaysRegex,this._weekdaysStrictRegex=new RegExp("^("+u.join("|")+")","i"),this._weekdaysShortStrictRegex=new RegExp("^("+o.join("|")+")","i"),this._weekdaysMinStrictRegex=new RegExp("^("+a.join("|")+")","i")}function Xe(){return this.hours()%12||12}function Ke(e,t){I(e,0,0,function(){return this.localeData().meridiem(this.hours(),this.minutes(),t)})}function et(e,t){return t._meridiemParse}I("H",["HH",2],0,"hour"),I("h",["hh",2],0,Xe),I("k",["kk",2],0,function(){return this.hours()||24}),I("hmm",0,0,function(){return""+Xe.apply(this)+L(this.minutes(),2)}),I("hmmss",0,0,function(){return""+Xe.apply(this)+L(this.minutes(),2)+L(this.seconds(),2)}),I("Hmm",0,0,function(){return""+this.hours()+L(this.minutes(),2)}),I("Hmmss",0,0,function(){return""+this.hours()+L(this.minutes(),2)+L(this.seconds(),2)}),Ke("a",!0),Ke("A",!1),C("hour","h"),F("hour",13),ue("a",et),ue("A",et),ue("H",B),ue("h",B),ue("k",B),ue("HH",B,z),ue("hh",B,z),ue("kk",B,z),ue("hmm",Q),ue("hmmss",X),ue("Hmm",Q),ue("Hmmss",X),ce(["H","HH"],ge),ce(["k","kk"],function(e,t,n){var s=D(e);t[ge]=24===s?0:s}),ce(["a","A"],function(e,t,n){n._isPm=n._locale.isPM(e),n._meridiem=e}),ce(["h","hh"],function(e,t,n){t[ge]=D(e),g(n).bigHour=!0}),ce("hmm",function(e,t,n){var s=e.length-2;t[ge]=D(e.substr(0,s)),t[ve]=D(e.substr(s)),g(n).bigHour=!0}),ce("hmmss",function(e,t,n){var s=e.length-4,i=e.length-2;t[ge]=D(e.substr(0,s)),t[ve]=D(e.substr(s,2)),t[pe]=D(e.substr(i)),g(n).bigHour=!0}),ce("Hmm",function(e,t,n){var s=e.length-2;t[ge]=D(e.substr(0,s)),t[ve]=D(e.substr(s))}),ce("Hmmss",function(e,t,n){var s=e.length-4,i=e.length-2;t[ge]=D(e.substr(0,s)),t[ve]=D(e.substr(s,2)),t[pe]=D(e.substr(i))});var tt,nt=Te("Hours",!0),st={calendar:{sameDay:"[Today at] LT",nextDay:"[Tomorrow at] LT",nextWeek:"dddd [at] LT",lastDay:"[Yesterday at] LT",lastWeek:"[Last] dddd [at] LT",sameElse:"L"},longDateFormat:{LTS:"h:mm:ss A",LT:"h:mm A",L:"MM/DD/YYYY",LL:"MMMM D, YYYY",LLL:"MMMM D, YYYY h:mm A",LLLL:"dddd, MMMM D, YYYY h:mm A"},invalidDate:"Invalid date",ordinal:"%d",dayOfMonthOrdinalParse:/\d{1,2}/,relativeTime:{future:"in %s",past:"%s ago",s:"a few seconds",ss:"%d seconds",m:"a minute",mm:"%d minutes",h:"an hour",hh:"%d hours",d:"a day",dd:"%d days",M:"a month",MM:"%d months",y:"a year",yy:"%d years"},months:Ce,monthsShort:He,week:{dow:0,doy:6},weekdays:Ze,weekdaysMin:$e,weekdaysShort:ze,meridiemParse:/[ap]\.?m?\.?/i},it={},rt={};function at(e){return e?e.toLowerCase().replace("_","-"):e}function ot(e){var t=null;if(!it[e]&&"undefined"!=typeof module&&module&&module.exports)try{t=tt._abbr,require("./locale/"+e),ut(t)}catch(e){}return it[e]}function ut(e,t){var n;return e&&((n=l(t)?ht(e):lt(e,t))?tt=n:"undefined"!=typeof console&&console.warn&&console.warn("Locale "+e+" not found. Did you forget to load it?")),tt._abbr}function lt(e,t){if(null===t)return delete it[e],null;var n,s=st;if(t.abbr=e,null!=it[e])T("defineLocaleOverride","use moment.updateLocale(localeName, config) to change an existing locale. moment.defineLocale(localeName, config) should only be used for creating a new locale See http://momentjs.com/guides/#/warnings/define-locale/ for more info."),s=it[e]._config;else if(null!=t.parentLocale)if(null!=it[t.parentLocale])s=it[t.parentLocale]._config;else{if(null==(n=ot(t.parentLocale)))return rt[t.parentLocale]||(rt[t.parentLocale]=[]),rt[t.parentLocale].push({name:e,config:t}),null;s=n._config}return it[e]=new P(x(s,t)),rt[e]&&rt[e].forEach(function(e){lt(e.name,e.config)}),ut(e),it[e]}function ht(e){var t;if(e&&e._locale&&e._locale._abbr&&(e=e._locale._abbr),!e)return tt;if(!o(e)){if(t=ot(e))return t;e=[e]}return function(e){for(var t,n,s,i,r=0;r<e.length;){for(t=(i=at(e[r]).split("-")).length,n=(n=at(e[r+1]))?n.split("-"):null;0<t;){if(s=ot(i.slice(0,t).join("-")))return s;if(n&&n.length>=t&&a(i,n,!0)>=t-1)break;t--}r++}return tt}(e)}function dt(e){var t,n=e._a;return n&&-2===g(e).overflow&&(t=n[_e]<0||11<n[_e]?_e:n[ye]<1||n[ye]>Pe(n[me],n[_e])?ye:n[ge]<0||24<n[ge]||24===n[ge]&&(0!==n[ve]||0!==n[pe]||0!==n[we])?ge:n[ve]<0||59<n[ve]?ve:n[pe]<0||59<n[pe]?pe:n[we]<0||999<n[we]?we:-1,g(e)._overflowDayOfYear&&(t<me||ye<t)&&(t=ye),g(e)._overflowWeeks&&-1===t&&(t=Me),g(e)._overflowWeekday&&-1===t&&(t=ke),g(e).overflow=t),e}function ct(e,t,n){return null!=e?e:null!=t?t:n}function ft(e){var t,n,s,i,r,a=[];if(!e._d){var o,u;for(o=e,u=new Date(c.now()),s=o._useUTC?[u.getUTCFullYear(),u.getUTCMonth(),u.getUTCDate()]:[u.getFullYear(),u.getMonth(),u.getDate()],e._w&&null==e._a[ye]&&null==e._a[_e]&&function(e){var t,n,s,i,r,a,o,u;if(null!=(t=e._w).GG||null!=t.W||null!=t.E)r=1,a=4,n=ct(t.GG,e._a[me],Ie(bt(),1,4).year),s=ct(t.W,1),((i=ct(t.E,1))<1||7<i)&&(u=!0);else{r=e._locale._week.dow,a=e._locale._week.doy;var l=Ie(bt(),r,a);n=ct(t.gg,e._a[me],l.year),s=ct(t.w,l.week),null!=t.d?((i=t.d)<0||6<i)&&(u=!0):null!=t.e?(i=t.e+r,(t.e<0||6<t.e)&&(u=!0)):i=r}s<1||s>Ae(n,r,a)?g(e)._overflowWeeks=!0:null!=u?g(e)._overflowWeekday=!0:(o=Ee(n,s,i,r,a),e._a[me]=o.year,e._dayOfYear=o.dayOfYear)}(e),null!=e._dayOfYear&&(r=ct(e._a[me],s[me]),(e._dayOfYear>Se(r)||0===e._dayOfYear)&&(g(e)._overflowDayOfYear=!0),n=Ge(r,0,e._dayOfYear),e._a[_e]=n.getUTCMonth(),e._a[ye]=n.getUTCDate()),t=0;t<3&&null==e._a[t];++t)e._a[t]=a[t]=s[t];for(;t<7;t++)e._a[t]=a[t]=null==e._a[t]?2===t?1:0:e._a[t];24===e._a[ge]&&0===e._a[ve]&&0===e._a[pe]&&0===e._a[we]&&(e._nextDay=!0,e._a[ge]=0),e._d=(e._useUTC?Ge:function(e,t,n,s,i,r,a){var o;return e<100&&0<=e?(o=new Date(e+400,t,n,s,i,r,a),isFinite(o.getFullYear())&&o.setFullYear(e)):o=new Date(e,t,n,s,i,r,a),o}).apply(null,a),i=e._useUTC?e._d.getUTCDay():e._d.getDay(),null!=e._tzm&&e._d.setUTCMinutes(e._d.getUTCMinutes()-e._tzm),e._nextDay&&(e._a[ge]=24),e._w&&void 0!==e._w.d&&e._w.d!==i&&(g(e).weekdayMismatch=!0)}}var mt=/^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,_t=/^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/,yt=/Z|[+-]\d\d(?::?\d\d)?/,gt=[["YYYYYY-MM-DD",/[+-]\d{6}-\d\d-\d\d/],["YYYY-MM-DD",/\d{4}-\d\d-\d\d/],["GGGG-[W]WW-E",/\d{4}-W\d\d-\d/],["GGGG-[W]WW",/\d{4}-W\d\d/,!1],["YYYY-DDD",/\d{4}-\d{3}/],["YYYY-MM",/\d{4}-\d\d/,!1],["YYYYYYMMDD",/[+-]\d{10}/],["YYYYMMDD",/\d{8}/],["GGGG[W]WWE",/\d{4}W\d{3}/],["GGGG[W]WW",/\d{4}W\d{2}/,!1],["YYYYDDD",/\d{7}/]],vt=[["HH:mm:ss.SSSS",/\d\d:\d\d:\d\d\.\d+/],["HH:mm:ss,SSSS",/\d\d:\d\d:\d\d,\d+/],["HH:mm:ss",/\d\d:\d\d:\d\d/],["HH:mm",/\d\d:\d\d/],["HHmmss.SSSS",/\d\d\d\d\d\d\.\d+/],["HHmmss,SSSS",/\d\d\d\d\d\d,\d+/],["HHmmss",/\d\d\d\d\d\d/],["HHmm",/\d\d\d\d/],["HH",/\d\d/]],pt=/^\/?Date\((\-?\d+)/i;function wt(e){var t,n,s,i,r,a,o=e._i,u=mt.exec(o)||_t.exec(o);if(u){for(g(e).iso=!0,t=0,n=gt.length;t<n;t++)if(gt[t][1].exec(u[1])){i=gt[t][0],s=!1!==gt[t][2];break}if(null==i)return void(e._isValid=!1);if(u[3]){for(t=0,n=vt.length;t<n;t++)if(vt[t][1].exec(u[3])){r=(u[2]||" ")+vt[t][0];break}if(null==r)return void(e._isValid=!1)}if(!s&&null!=r)return void(e._isValid=!1);if(u[4]){if(!yt.exec(u[4]))return void(e._isValid=!1);a="Z"}e._f=i+(r||"")+(a||""),Yt(e)}else e._isValid=!1}var Mt=/^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;function kt(e,t,n,s,i,r){var a=[function(e){var t=parseInt(e,10);{if(t<=49)return 2e3+t;if(t<=999)return 1900+t}return t}(e),He.indexOf(t),parseInt(n,10),parseInt(s,10),parseInt(i,10)];return r&&a.push(parseInt(r,10)),a}var St={UT:0,GMT:0,EDT:-240,EST:-300,CDT:-300,CST:-360,MDT:-360,MST:-420,PDT:-420,PST:-480};function Dt(e){var t,n,s,i=Mt.exec(e._i.replace(/\([^)]*\)|[\n\t]/g," ").replace(/(\s\s+)/g," ").replace(/^\s\s*/,"").replace(/\s\s*$/,""));if(i){var r=kt(i[4],i[3],i[2],i[5],i[6],i[7]);if(t=i[1],n=r,s=e,t&&ze.indexOf(t)!==new Date(n[0],n[1],n[2]).getDay()&&(g(s).weekdayMismatch=!0,!(s._isValid=!1)))return;e._a=r,e._tzm=function(e,t,n){if(e)return St[e];if(t)return 0;var s=parseInt(n,10),i=s%100;return(s-i)/100*60+i}(i[8],i[9],i[10]),e._d=Ge.apply(null,e._a),e._d.setUTCMinutes(e._d.getUTCMinutes()-e._tzm),g(e).rfc2822=!0}else e._isValid=!1}function Yt(e){if(e._f!==c.ISO_8601)if(e._f!==c.RFC_2822){e._a=[],g(e).empty=!0;var t,n,s,i,r,a,o,u,l=""+e._i,h=l.length,d=0;for(s=j(e._f,e._locale).match(N)||[],t=0;t<s.length;t++)i=s[t],(n=(l.match(le(i,e))||[])[0])&&(0<(r=l.substr(0,l.indexOf(n))).length&&g(e).unusedInput.push(r),l=l.slice(l.indexOf(n)+n.length),d+=n.length),E[i]?(n?g(e).empty=!1:g(e).unusedTokens.push(i),a=i,u=e,null!=(o=n)&&m(de,a)&&de[a](o,u._a,u,a)):e._strict&&!n&&g(e).unusedTokens.push(i);g(e).charsLeftOver=h-d,0<l.length&&g(e).unusedInput.push(l),e._a[ge]<=12&&!0===g(e).bigHour&&0<e._a[ge]&&(g(e).bigHour=void 0),g(e).parsedDateParts=e._a.slice(0),g(e).meridiem=e._meridiem,e._a[ge]=function(e,t,n){var s;if(null==n)return t;return null!=e.meridiemHour?e.meridiemHour(t,n):(null!=e.isPM&&((s=e.isPM(n))&&t<12&&(t+=12),s||12!==t||(t=0)),t)}(e._locale,e._a[ge],e._meridiem),ft(e),dt(e)}else Dt(e);else wt(e)}function Ot(e){var t,n,s,i,r=e._i,a=e._f;return e._locale=e._locale||ht(e._l),null===r||void 0===a&&""===r?p({nullInput:!0}):("string"==typeof r&&(e._i=r=e._locale.preparse(r)),k(r)?new M(dt(r)):(d(r)?e._d=r:o(a)?function(e){var t,n,s,i,r;if(0===e._f.length)return g(e).invalidFormat=!0,e._d=new Date(NaN);for(i=0;i<e._f.length;i++)r=0,t=w({},e),null!=e._useUTC&&(t._useUTC=e._useUTC),t._f=e._f[i],Yt(t),v(t)&&(r+=g(t).charsLeftOver,r+=10*g(t).unusedTokens.length,g(t).score=r,(null==s||r<s)&&(s=r,n=t));_(e,n||t)}(e):a?Yt(e):l(n=(t=e)._i)?t._d=new Date(c.now()):d(n)?t._d=new Date(n.valueOf()):"string"==typeof n?(s=t,null===(i=pt.exec(s._i))?(wt(s),!1===s._isValid&&(delete s._isValid,Dt(s),!1===s._isValid&&(delete s._isValid,c.createFromInputFallback(s)))):s._d=new Date(+i[1])):o(n)?(t._a=f(n.slice(0),function(e){return parseInt(e,10)}),ft(t)):u(n)?function(e){if(!e._d){var t=R(e._i);e._a=f([t.year,t.month,t.day||t.date,t.hour,t.minute,t.second,t.millisecond],function(e){return e&&parseInt(e,10)}),ft(e)}}(t):h(n)?t._d=new Date(n):c.createFromInputFallback(t),v(e)||(e._d=null),e))}function Tt(e,t,n,s,i){var r,a={};return!0!==n&&!1!==n||(s=n,n=void 0),(u(e)&&function(e){if(Object.getOwnPropertyNames)return 0===Object.getOwnPropertyNames(e).length;var t;for(t in e)if(e.hasOwnProperty(t))return!1;return!0}(e)||o(e)&&0===e.length)&&(e=void 0),a._isAMomentObject=!0,a._useUTC=a._isUTC=i,a._l=n,a._i=e,a._f=t,a._strict=s,(r=new M(dt(Ot(a))))._nextDay&&(r.add(1,"d"),r._nextDay=void 0),r}function bt(e,t,n,s){return Tt(e,t,n,s,!1)}c.createFromInputFallback=n("value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.",function(e){e._d=new Date(e._i+(e._useUTC?" UTC":""))}),c.ISO_8601=function(){},c.RFC_2822=function(){};var xt=n("moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=bt.apply(null,arguments);return this.isValid()&&e.isValid()?e<this?this:e:p()}),Pt=n("moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/",function(){var e=bt.apply(null,arguments);return this.isValid()&&e.isValid()?this<e?this:e:p()});function Wt(e,t){var n,s;if(1===t.length&&o(t[0])&&(t=t[0]),!t.length)return bt();for(n=t[0],s=1;s<t.length;++s)t[s].isValid()&&!t[s][e](n)||(n=t[s]);return n}var Ct=["year","quarter","month","week","day","hour","minute","second","millisecond"];function Ht(e){var t=R(e),n=t.year||0,s=t.quarter||0,i=t.month||0,r=t.week||t.isoWeek||0,a=t.day||0,o=t.hour||0,u=t.minute||0,l=t.second||0,h=t.millisecond||0;this._isValid=function(e){for(var t in e)if(-1===Ye.call(Ct,t)||null!=e[t]&&isNaN(e[t]))return!1;for(var n=!1,s=0;s<Ct.length;++s)if(e[Ct[s]]){if(n)return!1;parseFloat(e[Ct[s]])!==D(e[Ct[s]])&&(n=!0)}return!0}(t),this._milliseconds=+h+1e3*l+6e4*u+1e3*o*60*60,this._days=+a+7*r,this._months=+i+3*s+12*n,this._data={},this._locale=ht(),this._bubble()}function Rt(e){return e instanceof Ht}function Ut(e){return e<0?-1*Math.round(-1*e):Math.round(e)}function Ft(e,n){I(e,0,0,function(){var e=this.utcOffset(),t="+";return e<0&&(e=-e,t="-"),t+L(~~(e/60),2)+n+L(~~e%60,2)})}Ft("Z",":"),Ft("ZZ",""),ue("Z",re),ue("ZZ",re),ce(["Z","ZZ"],function(e,t,n){n._useUTC=!0,n._tzm=Nt(re,e)});var Lt=/([\+\-]|\d\d)/gi;function Nt(e,t){var n=(t||"").match(e);if(null===n)return null;var s=((n[n.length-1]||[])+"").match(Lt)||["-",0,0],i=60*s[1]+D(s[2]);return 0===i?0:"+"===s[0]?i:-i}function Gt(e,t){var n,s;return t._isUTC?(n=t.clone(),s=(k(e)||d(e)?e.valueOf():bt(e).valueOf())-n.valueOf(),n._d.setTime(n._d.valueOf()+s),c.updateOffset(n,!1),n):bt(e).local()}function Vt(e){return 15*-Math.round(e._d.getTimezoneOffset()/15)}function Et(){return!!this.isValid()&&(this._isUTC&&0===this._offset)}c.updateOffset=function(){};var It=/^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/,At=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;function jt(e,t){var n,s,i,r=e,a=null;return Rt(e)?r={ms:e._milliseconds,d:e._days,M:e._months}:h(e)?(r={},t?r[t]=e:r.milliseconds=e):(a=It.exec(e))?(n="-"===a[1]?-1:1,r={y:0,d:D(a[ye])*n,h:D(a[ge])*n,m:D(a[ve])*n,s:D(a[pe])*n,ms:D(Ut(1e3*a[we]))*n}):(a=At.exec(e))?(n="-"===a[1]?-1:1,r={y:Zt(a[2],n),M:Zt(a[3],n),w:Zt(a[4],n),d:Zt(a[5],n),h:Zt(a[6],n),m:Zt(a[7],n),s:Zt(a[8],n)}):null==r?r={}:"object"==typeof r&&("from"in r||"to"in r)&&(i=function(e,t){var n;if(!e.isValid()||!t.isValid())return{milliseconds:0,months:0};t=Gt(t,e),e.isBefore(t)?n=zt(e,t):((n=zt(t,e)).milliseconds=-n.milliseconds,n.months=-n.months);return n}(bt(r.from),bt(r.to)),(r={}).ms=i.milliseconds,r.M=i.months),s=new Ht(r),Rt(e)&&m(e,"_locale")&&(s._locale=e._locale),s}function Zt(e,t){var n=e&&parseFloat(e.replace(",","."));return(isNaN(n)?0:n)*t}function zt(e,t){var n={};return n.months=t.month()-e.month()+12*(t.year()-e.year()),e.clone().add(n.months,"M").isAfter(t)&&--n.months,n.milliseconds=+t-+e.clone().add(n.months,"M"),n}function $t(s,i){return function(e,t){var n;return null===t||isNaN(+t)||(T(i,"moment()."+i+"(period, number) is deprecated. Please use moment()."+i+"(number, period). See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info."),n=e,e=t,t=n),qt(this,jt(e="string"==typeof e?+e:e,t),s),this}}function qt(e,t,n,s){var i=t._milliseconds,r=Ut(t._days),a=Ut(t._months);e.isValid()&&(s=null==s||s,a&&Re(e,be(e,"Month")+a*n),r&&xe(e,"Date",be(e,"Date")+r*n),i&&e._d.setTime(e._d.valueOf()+i*n),s&&c.updateOffset(e,r||a))}jt.fn=Ht.prototype,jt.invalid=function(){return jt(NaN)};var Jt=$t(1,"add"),Bt=$t(-1,"subtract");function Qt(e,t){var n=12*(t.year()-e.year())+(t.month()-e.month()),s=e.clone().add(n,"months");return-(n+(t-s<0?(t-s)/(s-e.clone().add(n-1,"months")):(t-s)/(e.clone().add(n+1,"months")-s)))||0}function Xt(e){var t;return void 0===e?this._locale._abbr:(null!=(t=ht(e))&&(this._locale=t),this)}c.defaultFormat="YYYY-MM-DDTHH:mm:ssZ",c.defaultFormatUtc="YYYY-MM-DDTHH:mm:ss[Z]";var Kt=n("moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.",function(e){return void 0===e?this.localeData():this.locale(e)});function en(){return this._locale}var tn=126227808e5;function nn(e,t){return(e%t+t)%t}function sn(e,t,n){return e<100&&0<=e?new Date(e+400,t,n)-tn:new Date(e,t,n).valueOf()}function rn(e,t,n){return e<100&&0<=e?Date.UTC(e+400,t,n)-tn:Date.UTC(e,t,n)}function an(e,t){I(0,[e,e.length],0,t)}function on(e,t,n,s,i){var r;return null==e?Ie(this,s,i).year:((r=Ae(e,s,i))<t&&(t=r),function(e,t,n,s,i){var r=Ee(e,t,n,s,i),a=Ge(r.year,0,r.dayOfYear);return this.year(a.getUTCFullYear()),this.month(a.getUTCMonth()),this.date(a.getUTCDate()),this}.call(this,e,t,n,s,i))}I(0,["gg",2],0,function(){return this.weekYear()%100}),I(0,["GG",2],0,function(){return this.isoWeekYear()%100}),an("gggg","weekYear"),an("ggggg","weekYear"),an("GGGG","isoWeekYear"),an("GGGGG","isoWeekYear"),C("weekYear","gg"),C("isoWeekYear","GG"),F("weekYear",1),F("isoWeekYear",1),ue("G",se),ue("g",se),ue("GG",B,z),ue("gg",B,z),ue("GGGG",ee,q),ue("gggg",ee,q),ue("GGGGG",te,J),ue("ggggg",te,J),fe(["gggg","ggggg","GGGG","GGGGG"],function(e,t,n,s){t[s.substr(0,2)]=D(e)}),fe(["gg","GG"],function(e,t,n,s){t[s]=c.parseTwoDigitYear(e)}),I("Q",0,"Qo","quarter"),C("quarter","Q"),F("quarter",7),ue("Q",Z),ce("Q",function(e,t){t[_e]=3*(D(e)-1)}),I("D",["DD",2],"Do","date"),C("date","D"),F("date",9),ue("D",B),ue("DD",B,z),ue("Do",function(e,t){return e?t._dayOfMonthOrdinalParse||t._ordinalParse:t._dayOfMonthOrdinalParseLenient}),ce(["D","DD"],ye),ce("Do",function(e,t){t[ye]=D(e.match(B)[0])});var un=Te("Date",!0);I("DDD",["DDDD",3],"DDDo","dayOfYear"),C("dayOfYear","DDD"),F("dayOfYear",4),ue("DDD",K),ue("DDDD",$),ce(["DDD","DDDD"],function(e,t,n){n._dayOfYear=D(e)}),I("m",["mm",2],0,"minute"),C("minute","m"),F("minute",14),ue("m",B),ue("mm",B,z),ce(["m","mm"],ve);var ln=Te("Minutes",!1);I("s",["ss",2],0,"second"),C("second","s"),F("second",15),ue("s",B),ue("ss",B,z),ce(["s","ss"],pe);var hn,dn=Te("Seconds",!1);for(I("S",0,0,function(){return~~(this.millisecond()/100)}),I(0,["SS",2],0,function(){return~~(this.millisecond()/10)}),I(0,["SSS",3],0,"millisecond"),I(0,["SSSS",4],0,function(){return 10*this.millisecond()}),I(0,["SSSSS",5],0,function(){return 100*this.millisecond()}),I(0,["SSSSSS",6],0,function(){return 1e3*this.millisecond()}),I(0,["SSSSSSS",7],0,function(){return 1e4*this.millisecond()}),I(0,["SSSSSSSS",8],0,function(){return 1e5*this.millisecond()}),I(0,["SSSSSSSSS",9],0,function(){return 1e6*this.millisecond()}),C("millisecond","ms"),F("millisecond",16),ue("S",K,Z),ue("SS",K,z),ue("SSS",K,$),hn="SSSS";hn.length<=9;hn+="S")ue(hn,ne);function cn(e,t){t[we]=D(1e3*("0."+e))}for(hn="S";hn.length<=9;hn+="S")ce(hn,cn);var fn=Te("Milliseconds",!1);I("z",0,0,"zoneAbbr"),I("zz",0,0,"zoneName");var mn=M.prototype;function _n(e){return e}mn.add=Jt,mn.calendar=function(e,t){var n=e||bt(),s=Gt(n,this).startOf("day"),i=c.calendarFormat(this,s)||"sameElse",r=t&&(b(t[i])?t[i].call(this,n):t[i]);return this.format(r||this.localeData().calendar(i,this,bt(n)))},mn.clone=function(){return new M(this)},mn.diff=function(e,t,n){var s,i,r;if(!this.isValid())return NaN;if(!(s=Gt(e,this)).isValid())return NaN;switch(i=6e4*(s.utcOffset()-this.utcOffset()),t=H(t)){case"year":r=Qt(this,s)/12;break;case"month":r=Qt(this,s);break;case"quarter":r=Qt(this,s)/3;break;case"second":r=(this-s)/1e3;break;case"minute":r=(this-s)/6e4;break;case"hour":r=(this-s)/36e5;break;case"day":r=(this-s-i)/864e5;break;case"week":r=(this-s-i)/6048e5;break;default:r=this-s}return n?r:S(r)},mn.endOf=function(e){var t;if(void 0===(e=H(e))||"millisecond"===e||!this.isValid())return this;var n=this._isUTC?rn:sn;switch(e){case"year":t=n(this.year()+1,0,1)-1;break;case"quarter":t=n(this.year(),this.month()-this.month()%3+3,1)-1;break;case"month":t=n(this.year(),this.month()+1,1)-1;break;case"week":t=n(this.year(),this.month(),this.date()-this.weekday()+7)-1;break;case"isoWeek":t=n(this.year(),this.month(),this.date()-(this.isoWeekday()-1)+7)-1;break;case"day":case"date":t=n(this.year(),this.month(),this.date()+1)-1;break;case"hour":t=this._d.valueOf(),t+=36e5-nn(t+(this._isUTC?0:6e4*this.utcOffset()),36e5)-1;break;case"minute":t=this._d.valueOf(),t+=6e4-nn(t,6e4)-1;break;case"second":t=this._d.valueOf(),t+=1e3-nn(t,1e3)-1;break}return this._d.setTime(t),c.updateOffset(this,!0),this},mn.format=function(e){e||(e=this.isUtc()?c.defaultFormatUtc:c.defaultFormat);var t=A(this,e);return this.localeData().postformat(t)},mn.from=function(e,t){return this.isValid()&&(k(e)&&e.isValid()||bt(e).isValid())?jt({to:this,from:e}).locale(this.locale()).humanize(!t):this.localeData().invalidDate()},mn.fromNow=function(e){return this.from(bt(),e)},mn.to=function(e,t){return this.isValid()&&(k(e)&&e.isValid()||bt(e).isValid())?jt({from:this,to:e}).locale(this.locale()).humanize(!t):this.localeData().invalidDate()},mn.toNow=function(e){return this.to(bt(),e)},mn.get=function(e){return b(this[e=H(e)])?this[e]():this},mn.invalidAt=function(){return g(this).overflow},mn.isAfter=function(e,t){var n=k(e)?e:bt(e);return!(!this.isValid()||!n.isValid())&&("millisecond"===(t=H(t)||"millisecond")?this.valueOf()>n.valueOf():n.valueOf()<this.clone().startOf(t).valueOf())},mn.isBefore=function(e,t){var n=k(e)?e:bt(e);return!(!this.isValid()||!n.isValid())&&("millisecond"===(t=H(t)||"millisecond")?this.valueOf()<n.valueOf():this.clone().endOf(t).valueOf()<n.valueOf())},mn.isBetween=function(e,t,n,s){var i=k(e)?e:bt(e),r=k(t)?t:bt(t);return!!(this.isValid()&&i.isValid()&&r.isValid())&&("("===(s=s||"()")[0]?this.isAfter(i,n):!this.isBefore(i,n))&&(")"===s[1]?this.isBefore(r,n):!this.isAfter(r,n))},mn.isSame=function(e,t){var n,s=k(e)?e:bt(e);return!(!this.isValid()||!s.isValid())&&("millisecond"===(t=H(t)||"millisecond")?this.valueOf()===s.valueOf():(n=s.valueOf(),this.clone().startOf(t).valueOf()<=n&&n<=this.clone().endOf(t).valueOf()))},mn.isSameOrAfter=function(e,t){return this.isSame(e,t)||this.isAfter(e,t)},mn.isSameOrBefore=function(e,t){return this.isSame(e,t)||this.isBefore(e,t)},mn.isValid=function(){return v(this)},mn.lang=Kt,mn.locale=Xt,mn.localeData=en,mn.max=Pt,mn.min=xt,mn.parsingFlags=function(){return _({},g(this))},mn.set=function(e,t){if("object"==typeof e)for(var n=function(e){var t=[];for(var n in e)t.push({unit:n,priority:U[n]});return t.sort(function(e,t){return e.priority-t.priority}),t}(e=R(e)),s=0;s<n.length;s++)this[n[s].unit](e[n[s].unit]);else if(b(this[e=H(e)]))return this[e](t);return this},mn.startOf=function(e){var t;if(void 0===(e=H(e))||"millisecond"===e||!this.isValid())return this;var n=this._isUTC?rn:sn;switch(e){case"year":t=n(this.year(),0,1);break;case"quarter":t=n(this.year(),this.month()-this.month()%3,1);break;case"month":t=n(this.year(),this.month(),1);break;case"week":t=n(this.year(),this.month(),this.date()-this.weekday());break;case"isoWeek":t=n(this.year(),this.month(),this.date()-(this.isoWeekday()-1));break;case"day":case"date":t=n(this.year(),this.month(),this.date());break;case"hour":t=this._d.valueOf(),t-=nn(t+(this._isUTC?0:6e4*this.utcOffset()),36e5);break;case"minute":t=this._d.valueOf(),t-=nn(t,6e4);break;case"second":t=this._d.valueOf(),t-=nn(t,1e3);break}return this._d.setTime(t),c.updateOffset(this,!0),this},mn.subtract=Bt,mn.toArray=function(){var e=this;return[e.year(),e.month(),e.date(),e.hour(),e.minute(),e.second(),e.millisecond()]},mn.toObject=function(){var e=this;return{years:e.year(),months:e.month(),date:e.date(),hours:e.hours(),minutes:e.minutes(),seconds:e.seconds(),milliseconds:e.milliseconds()}},mn.toDate=function(){return new Date(this.valueOf())},mn.toISOString=function(e){if(!this.isValid())return null;var t=!0!==e,n=t?this.clone().utc():this;return n.year()<0||9999<n.year()?A(n,t?"YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]":"YYYYYY-MM-DD[T]HH:mm:ss.SSSZ"):b(Date.prototype.toISOString)?t?this.toDate().toISOString():new Date(this.valueOf()+60*this.utcOffset()*1e3).toISOString().replace("Z",A(n,"Z")):A(n,t?"YYYY-MM-DD[T]HH:mm:ss.SSS[Z]":"YYYY-MM-DD[T]HH:mm:ss.SSSZ")},mn.inspect=function(){if(!this.isValid())return"moment.invalid(/* "+this._i+" */)";var e="moment",t="";this.isLocal()||(e=0===this.utcOffset()?"moment.utc":"moment.parseZone",t="Z");var n="["+e+'("]',s=0<=this.year()&&this.year()<=9999?"YYYY":"YYYYYY",i=t+'[")]';return this.format(n+s+"-MM-DD[T]HH:mm:ss.SSS"+i)},mn.toJSON=function(){return this.isValid()?this.toISOString():null},mn.toString=function(){return this.clone().locale("en").format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ")},mn.unix=function(){return Math.floor(this.valueOf()/1e3)},mn.valueOf=function(){return this._d.valueOf()-6e4*(this._offset||0)},mn.creationData=function(){return{input:this._i,format:this._f,locale:this._locale,isUTC:this._isUTC,strict:this._strict}},mn.year=Oe,mn.isLeapYear=function(){return De(this.year())},mn.weekYear=function(e){return on.call(this,e,this.week(),this.weekday(),this.localeData()._week.dow,this.localeData()._week.doy)},mn.isoWeekYear=function(e){return on.call(this,e,this.isoWeek(),this.isoWeekday(),1,4)},mn.quarter=mn.quarters=function(e){return null==e?Math.ceil((this.month()+1)/3):this.month(3*(e-1)+this.month()%3)},mn.month=Ue,mn.daysInMonth=function(){return Pe(this.year(),this.month())},mn.week=mn.weeks=function(e){var t=this.localeData().week(this);return null==e?t:this.add(7*(e-t),"d")},mn.isoWeek=mn.isoWeeks=function(e){var t=Ie(this,1,4).week;return null==e?t:this.add(7*(e-t),"d")},mn.weeksInYear=function(){var e=this.localeData()._week;return Ae(this.year(),e.dow,e.doy)},mn.isoWeeksInYear=function(){return Ae(this.year(),1,4)},mn.date=un,mn.day=mn.days=function(e){if(!this.isValid())return null!=e?this:NaN;var t,n,s=this._isUTC?this._d.getUTCDay():this._d.getDay();return null!=e?(t=e,n=this.localeData(),e="string"!=typeof t?t:isNaN(t)?"number"==typeof(t=n.weekdaysParse(t))?t:null:parseInt(t,10),this.add(e-s,"d")):s},mn.weekday=function(e){if(!this.isValid())return null!=e?this:NaN;var t=(this.day()+7-this.localeData()._week.dow)%7;return null==e?t:this.add(e-t,"d")},mn.isoWeekday=function(e){if(!this.isValid())return null!=e?this:NaN;if(null==e)return this.day()||7;var t,n,s=(t=e,n=this.localeData(),"string"==typeof t?n.weekdaysParse(t)%7||7:isNaN(t)?null:t);return this.day(this.day()%7?s:s-7)},mn.dayOfYear=function(e){var t=Math.round((this.clone().startOf("day")-this.clone().startOf("year"))/864e5)+1;return null==e?t:this.add(e-t,"d")},mn.hour=mn.hours=nt,mn.minute=mn.minutes=ln,mn.second=mn.seconds=dn,mn.millisecond=mn.milliseconds=fn,mn.utcOffset=function(e,t,n){var s,i=this._offset||0;if(!this.isValid())return null!=e?this:NaN;if(null==e)return this._isUTC?i:Vt(this);if("string"==typeof e){if(null===(e=Nt(re,e)))return this}else Math.abs(e)<16&&!n&&(e*=60);return!this._isUTC&&t&&(s=Vt(this)),this._offset=e,this._isUTC=!0,null!=s&&this.add(s,"m"),i!==e&&(!t||this._changeInProgress?qt(this,jt(e-i,"m"),1,!1):this._changeInProgress||(this._changeInProgress=!0,c.updateOffset(this,!0),this._changeInProgress=null)),this},mn.utc=function(e){return this.utcOffset(0,e)},mn.local=function(e){return this._isUTC&&(this.utcOffset(0,e),this._isUTC=!1,e&&this.subtract(Vt(this),"m")),this},mn.parseZone=function(){if(null!=this._tzm)this.utcOffset(this._tzm,!1,!0);else if("string"==typeof this._i){var e=Nt(ie,this._i);null!=e?this.utcOffset(e):this.utcOffset(0,!0)}return this},mn.hasAlignedHourOffset=function(e){return!!this.isValid()&&(e=e?bt(e).utcOffset():0,(this.utcOffset()-e)%60==0)},mn.isDST=function(){return this.utcOffset()>this.clone().month(0).utcOffset()||this.utcOffset()>this.clone().month(5).utcOffset()},mn.isLocal=function(){return!!this.isValid()&&!this._isUTC},mn.isUtcOffset=function(){return!!this.isValid()&&this._isUTC},mn.isUtc=Et,mn.isUTC=Et,mn.zoneAbbr=function(){return this._isUTC?"UTC":""},mn.zoneName=function(){return this._isUTC?"Coordinated Universal Time":""},mn.dates=n("dates accessor is deprecated. Use date instead.",un),mn.months=n("months accessor is deprecated. Use month instead",Ue),mn.years=n("years accessor is deprecated. Use year instead",Oe),mn.zone=n("moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/",function(e,t){return null!=e?("string"!=typeof e&&(e=-e),this.utcOffset(e,t),this):-this.utcOffset()}),mn.isDSTShifted=n("isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information",function(){if(!l(this._isDSTShifted))return this._isDSTShifted;var e={};if(w(e,this),(e=Ot(e))._a){var t=e._isUTC?y(e._a):bt(e._a);this._isDSTShifted=this.isValid()&&0<a(e._a,t.toArray())}else this._isDSTShifted=!1;return this._isDSTShifted});var yn=P.prototype;function gn(e,t,n,s){var i=ht(),r=y().set(s,t);return i[n](r,e)}function vn(e,t,n){if(h(e)&&(t=e,e=void 0),e=e||"",null!=t)return gn(e,t,n,"month");var s,i=[];for(s=0;s<12;s++)i[s]=gn(e,s,n,"month");return i}function pn(e,t,n,s){t=("boolean"==typeof e?h(t)&&(n=t,t=void 0):(t=e,e=!1,h(n=t)&&(n=t,t=void 0)),t||"");var i,r=ht(),a=e?r._week.dow:0;if(null!=n)return gn(t,(n+a)%7,s,"day");var o=[];for(i=0;i<7;i++)o[i]=gn(t,(i+a)%7,s,"day");return o}yn.calendar=function(e,t,n){var s=this._calendar[e]||this._calendar.sameElse;return b(s)?s.call(t,n):s},yn.longDateFormat=function(e){var t=this._longDateFormat[e],n=this._longDateFormat[e.toUpperCase()];return t||!n?t:(this._longDateFormat[e]=n.replace(/MMMM|MM|DD|dddd/g,function(e){return e.slice(1)}),this._longDateFormat[e])},yn.invalidDate=function(){return this._invalidDate},yn.ordinal=function(e){return this._ordinal.replace("%d",e)},yn.preparse=_n,yn.postformat=_n,yn.relativeTime=function(e,t,n,s){var i=this._relativeTime[n];return b(i)?i(e,t,n,s):i.replace(/%d/i,e)},yn.pastFuture=function(e,t){var n=this._relativeTime[0<e?"future":"past"];return b(n)?n(t):n.replace(/%s/i,t)},yn.set=function(e){var t,n;for(n in e)b(t=e[n])?this[n]=t:this["_"+n]=t;this._config=e,this._dayOfMonthOrdinalParseLenient=new RegExp((this._dayOfMonthOrdinalParse.source||this._ordinalParse.source)+"|"+/\d{1,2}/.source)},yn.months=function(e,t){return e?o(this._months)?this._months[e.month()]:this._months[(this._months.isFormat||We).test(t)?"format":"standalone"][e.month()]:o(this._months)?this._months:this._months.standalone},yn.monthsShort=function(e,t){return e?o(this._monthsShort)?this._monthsShort[e.month()]:this._monthsShort[We.test(t)?"format":"standalone"][e.month()]:o(this._monthsShort)?this._monthsShort:this._monthsShort.standalone},yn.monthsParse=function(e,t,n){var s,i,r;if(this._monthsParseExact)return function(e,t,n){var s,i,r,a=e.toLocaleLowerCase();if(!this._monthsParse)for(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[],s=0;s<12;++s)r=y([2e3,s]),this._shortMonthsParse[s]=this.monthsShort(r,"").toLocaleLowerCase(),this._longMonthsParse[s]=this.months(r,"").toLocaleLowerCase();return n?"MMM"===t?-1!==(i=Ye.call(this._shortMonthsParse,a))?i:null:-1!==(i=Ye.call(this._longMonthsParse,a))?i:null:"MMM"===t?-1!==(i=Ye.call(this._shortMonthsParse,a))?i:-1!==(i=Ye.call(this._longMonthsParse,a))?i:null:-1!==(i=Ye.call(this._longMonthsParse,a))?i:-1!==(i=Ye.call(this._shortMonthsParse,a))?i:null}.call(this,e,t,n);for(this._monthsParse||(this._monthsParse=[],this._longMonthsParse=[],this._shortMonthsParse=[]),s=0;s<12;s++){if(i=y([2e3,s]),n&&!this._longMonthsParse[s]&&(this._longMonthsParse[s]=new RegExp("^"+this.months(i,"").replace(".","")+"$","i"),this._shortMonthsParse[s]=new RegExp("^"+this.monthsShort(i,"").replace(".","")+"$","i")),n||this._monthsParse[s]||(r="^"+this.months(i,"")+"|^"+this.monthsShort(i,""),this._monthsParse[s]=new RegExp(r.replace(".",""),"i")),n&&"MMMM"===t&&this._longMonthsParse[s].test(e))return s;if(n&&"MMM"===t&&this._shortMonthsParse[s].test(e))return s;if(!n&&this._monthsParse[s].test(e))return s}},yn.monthsRegex=function(e){return this._monthsParseExact?(m(this,"_monthsRegex")||Ne.call(this),e?this._monthsStrictRegex:this._monthsRegex):(m(this,"_monthsRegex")||(this._monthsRegex=Le),this._monthsStrictRegex&&e?this._monthsStrictRegex:this._monthsRegex)},yn.monthsShortRegex=function(e){return this._monthsParseExact?(m(this,"_monthsRegex")||Ne.call(this),e?this._monthsShortStrictRegex:this._monthsShortRegex):(m(this,"_monthsShortRegex")||(this._monthsShortRegex=Fe),this._monthsShortStrictRegex&&e?this._monthsShortStrictRegex:this._monthsShortRegex)},yn.week=function(e){return Ie(e,this._week.dow,this._week.doy).week},yn.firstDayOfYear=function(){return this._week.doy},yn.firstDayOfWeek=function(){return this._week.dow},yn.weekdays=function(e,t){var n=o(this._weekdays)?this._weekdays:this._weekdays[e&&!0!==e&&this._weekdays.isFormat.test(t)?"format":"standalone"];return!0===e?je(n,this._week.dow):e?n[e.day()]:n},yn.weekdaysMin=function(e){return!0===e?je(this._weekdaysMin,this._week.dow):e?this._weekdaysMin[e.day()]:this._weekdaysMin},yn.weekdaysShort=function(e){return!0===e?je(this._weekdaysShort,this._week.dow):e?this._weekdaysShort[e.day()]:this._weekdaysShort},yn.weekdaysParse=function(e,t,n){var s,i,r;if(this._weekdaysParseExact)return function(e,t,n){var s,i,r,a=e.toLocaleLowerCase();if(!this._weekdaysParse)for(this._weekdaysParse=[],this._shortWeekdaysParse=[],this._minWeekdaysParse=[],s=0;s<7;++s)r=y([2e3,1]).day(s),this._minWeekdaysParse[s]=this.weekdaysMin(r,"").toLocaleLowerCase(),this._shortWeekdaysParse[s]=this.weekdaysShort(r,"").toLocaleLowerCase(),this._weekdaysParse[s]=this.weekdays(r,"").toLocaleLowerCase();return n?"dddd"===t?-1!==(i=Ye.call(this._weekdaysParse,a))?i:null:"ddd"===t?-1!==(i=Ye.call(this._shortWeekdaysParse,a))?i:null:-1!==(i=Ye.call(this._minWeekdaysParse,a))?i:null:"dddd"===t?-1!==(i=Ye.call(this._weekdaysParse,a))?i:-1!==(i=Ye.call(this._shortWeekdaysParse,a))?i:-1!==(i=Ye.call(this._minWeekdaysParse,a))?i:null:"ddd"===t?-1!==(i=Ye.call(this._shortWeekdaysParse,a))?i:-1!==(i=Ye.call(this._weekdaysParse,a))?i:-1!==(i=Ye.call(this._minWeekdaysParse,a))?i:null:-1!==(i=Ye.call(this._minWeekdaysParse,a))?i:-1!==(i=Ye.call(this._weekdaysParse,a))?i:-1!==(i=Ye.call(this._shortWeekdaysParse,a))?i:null}.call(this,e,t,n);for(this._weekdaysParse||(this._weekdaysParse=[],this._minWeekdaysParse=[],this._shortWeekdaysParse=[],this._fullWeekdaysParse=[]),s=0;s<7;s++){if(i=y([2e3,1]).day(s),n&&!this._fullWeekdaysParse[s]&&(this._fullWeekdaysParse[s]=new RegExp("^"+this.weekdays(i,"").replace(".","\\.?")+"$","i"),this._shortWeekdaysParse[s]=new RegExp("^"+this.weekdaysShort(i,"").replace(".","\\.?")+"$","i"),this._minWeekdaysParse[s]=new RegExp("^"+this.weekdaysMin(i,"").replace(".","\\.?")+"$","i")),this._weekdaysParse[s]||(r="^"+this.weekdays(i,"")+"|^"+this.weekdaysShort(i,"")+"|^"+this.weekdaysMin(i,""),this._weekdaysParse[s]=new RegExp(r.replace(".",""),"i")),n&&"dddd"===t&&this._fullWeekdaysParse[s].test(e))return s;if(n&&"ddd"===t&&this._shortWeekdaysParse[s].test(e))return s;if(n&&"dd"===t&&this._minWeekdaysParse[s].test(e))return s;if(!n&&this._weekdaysParse[s].test(e))return s}},yn.weekdaysRegex=function(e){return this._weekdaysParseExact?(m(this,"_weekdaysRegex")||Qe.call(this),e?this._weekdaysStrictRegex:this._weekdaysRegex):(m(this,"_weekdaysRegex")||(this._weekdaysRegex=qe),this._weekdaysStrictRegex&&e?this._weekdaysStrictRegex:this._weekdaysRegex)},yn.weekdaysShortRegex=function(e){return this._weekdaysParseExact?(m(this,"_weekdaysRegex")||Qe.call(this),e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex):(m(this,"_weekdaysShortRegex")||(this._weekdaysShortRegex=Je),this._weekdaysShortStrictRegex&&e?this._weekdaysShortStrictRegex:this._weekdaysShortRegex)},yn.weekdaysMinRegex=function(e){return this._weekdaysParseExact?(m(this,"_weekdaysRegex")||Qe.call(this),e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex):(m(this,"_weekdaysMinRegex")||(this._weekdaysMinRegex=Be),this._weekdaysMinStrictRegex&&e?this._weekdaysMinStrictRegex:this._weekdaysMinRegex)},yn.isPM=function(e){return"p"===(e+"").toLowerCase().charAt(0)},yn.meridiem=function(e,t,n){return 11<e?n?"pm":"PM":n?"am":"AM"},ut("en",{dayOfMonthOrdinalParse:/\d{1,2}(th|st|nd|rd)/,ordinal:function(e){var t=e%10;return e+(1===D(e%100/10)?"th":1===t?"st":2===t?"nd":3===t?"rd":"th")}}),c.lang=n("moment.lang is deprecated. Use moment.locale instead.",ut),c.langData=n("moment.langData is deprecated. Use moment.localeData instead.",ht);var wn=Math.abs;function Mn(e,t,n,s){var i=jt(t,n);return e._milliseconds+=s*i._milliseconds,e._days+=s*i._days,e._months+=s*i._months,e._bubble()}function kn(e){return e<0?Math.floor(e):Math.ceil(e)}function Sn(e){return 4800*e/146097}function Dn(e){return 146097*e/4800}function Yn(e){return function(){return this.as(e)}}var On=Yn("ms"),Tn=Yn("s"),bn=Yn("m"),xn=Yn("h"),Pn=Yn("d"),Wn=Yn("w"),Cn=Yn("M"),Hn=Yn("Q"),Rn=Yn("y");function Un(e){return function(){return this.isValid()?this._data[e]:NaN}}var Fn=Un("milliseconds"),Ln=Un("seconds"),Nn=Un("minutes"),Gn=Un("hours"),Vn=Un("days"),En=Un("months"),In=Un("years");var An=Math.round,jn={ss:44,s:45,m:45,h:22,d:26,M:11};var Zn=Math.abs;function zn(e){return(0<e)-(e<0)||+e}function $n(){if(!this.isValid())return this.localeData().invalidDate();var e,t,n=Zn(this._milliseconds)/1e3,s=Zn(this._days),i=Zn(this._months);t=S((e=S(n/60))/60),n%=60,e%=60;var r=S(i/12),a=i%=12,o=s,u=t,l=e,h=n?n.toFixed(3).replace(/\.?0+$/,""):"",d=this.asSeconds();if(!d)return"P0D";var c=d<0?"-":"",f=zn(this._months)!==zn(d)?"-":"",m=zn(this._days)!==zn(d)?"-":"",_=zn(this._milliseconds)!==zn(d)?"-":"";return c+"P"+(r?f+r+"Y":"")+(a?f+a+"M":"")+(o?m+o+"D":"")+(u||l||h?"T":"")+(u?_+u+"H":"")+(l?_+l+"M":"")+(h?_+h+"S":"")}var qn=Ht.prototype;return qn.isValid=function(){return this._isValid},qn.abs=function(){var e=this._data;return this._milliseconds=wn(this._milliseconds),this._days=wn(this._days),this._months=wn(this._months),e.milliseconds=wn(e.milliseconds),e.seconds=wn(e.seconds),e.minutes=wn(e.minutes),e.hours=wn(e.hours),e.months=wn(e.months),e.years=wn(e.years),this},qn.add=function(e,t){return Mn(this,e,t,1)},qn.subtract=function(e,t){return Mn(this,e,t,-1)},qn.as=function(e){if(!this.isValid())return NaN;var t,n,s=this._milliseconds;if("month"===(e=H(e))||"quarter"===e||"year"===e)switch(t=this._days+s/864e5,n=this._months+Sn(t),e){case"month":return n;case"quarter":return n/3;case"year":return n/12}else switch(t=this._days+Math.round(Dn(this._months)),e){case"week":return t/7+s/6048e5;case"day":return t+s/864e5;case"hour":return 24*t+s/36e5;case"minute":return 1440*t+s/6e4;case"second":return 86400*t+s/1e3;case"millisecond":return Math.floor(864e5*t)+s;default:throw new Error("Unknown unit "+e)}},qn.asMilliseconds=On,qn.asSeconds=Tn,qn.asMinutes=bn,qn.asHours=xn,qn.asDays=Pn,qn.asWeeks=Wn,qn.asMonths=Cn,qn.asQuarters=Hn,qn.asYears=Rn,qn.valueOf=function(){return this.isValid()?this._milliseconds+864e5*this._days+this._months%12*2592e6+31536e6*D(this._months/12):NaN},qn._bubble=function(){var e,t,n,s,i,r=this._milliseconds,a=this._days,o=this._months,u=this._data;return 0<=r&&0<=a&&0<=o||r<=0&&a<=0&&o<=0||(r+=864e5*kn(Dn(o)+a),o=a=0),u.milliseconds=r%1e3,e=S(r/1e3),u.seconds=e%60,t=S(e/60),u.minutes=t%60,n=S(t/60),u.hours=n%24,o+=i=S(Sn(a+=S(n/24))),a-=kn(Dn(i)),s=S(o/12),o%=12,u.days=a,u.months=o,u.years=s,this},qn.clone=function(){return jt(this)},qn.get=function(e){return e=H(e),this.isValid()?this[e+"s"]():NaN},qn.milliseconds=Fn,qn.seconds=Ln,qn.minutes=Nn,qn.hours=Gn,qn.days=Vn,qn.weeks=function(){return S(this.days()/7)},qn.months=En,qn.years=In,qn.humanize=function(e){if(!this.isValid())return this.localeData().invalidDate();var t,n,s,i,r,a,o,u,l,h,d,c=this.localeData(),f=(n=!e,s=c,i=jt(t=this).abs(),r=An(i.as("s")),a=An(i.as("m")),o=An(i.as("h")),u=An(i.as("d")),l=An(i.as("M")),h=An(i.as("y")),(d=r<=jn.ss&&["s",r]||r<jn.s&&["ss",r]||a<=1&&["m"]||a<jn.m&&["mm",a]||o<=1&&["h"]||o<jn.h&&["hh",o]||u<=1&&["d"]||u<jn.d&&["dd",u]||l<=1&&["M"]||l<jn.M&&["MM",l]||h<=1&&["y"]||["yy",h])[2]=n,d[3]=0<+t,d[4]=s,function(e,t,n,s,i){return i.relativeTime(t||1,!!n,e,s)}.apply(null,d));return e&&(f=c.pastFuture(+this,f)),c.postformat(f)},qn.toISOString=$n,qn.toString=$n,qn.toJSON=$n,qn.locale=Xt,qn.localeData=en,qn.toIsoString=n("toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)",$n),qn.lang=Kt,I("X",0,0,"unix"),I("x",0,0,"valueOf"),ue("x",se),ue("X",/[+-]?\d+(\.\d{1,3})?/),ce("X",function(e,t,n){n._d=new Date(1e3*parseFloat(e,10))}),ce("x",function(e,t,n){n._d=new Date(D(e))}),c.version="2.24.0",e=bt,c.fn=mn,c.min=function(){return Wt("isBefore",[].slice.call(arguments,0))},c.max=function(){return Wt("isAfter",[].slice.call(arguments,0))},c.now=function(){return Date.now?Date.now():+new Date},c.utc=y,c.unix=function(e){return bt(1e3*e)},c.months=function(e,t){return vn(e,t,"months")},c.isDate=d,c.locale=ut,c.invalid=p,c.duration=jt,c.isMoment=k,c.weekdays=function(e,t,n){return pn(e,t,n,"weekdays")},c.parseZone=function(){return bt.apply(null,arguments).parseZone()},c.localeData=ht,c.isDuration=Rt,c.monthsShort=function(e,t){return vn(e,t,"monthsShort")},c.weekdaysMin=function(e,t,n){return pn(e,t,n,"weekdaysMin")},c.defineLocale=lt,c.updateLocale=function(e,t){if(null!=t){var n,s,i=st;null!=(s=ot(e))&&(i=s._config),(n=new P(t=x(i,t))).parentLocale=it[e],it[e]=n,ut(e)}else null!=it[e]&&(null!=it[e].parentLocale?it[e]=it[e].parentLocale:null!=it[e]&&delete it[e]);return it[e]},c.locales=function(){return s(it)},c.weekdaysShort=function(e,t,n){return pn(e,t,n,"weekdaysShort")},c.normalizeUnits=H,c.relativeTimeRounding=function(e){return void 0===e?An:"function"==typeof e&&(An=e,!0)},c.relativeTimeThreshold=function(e,t){return void 0!==jn[e]&&(void 0===t?jn[e]:(jn[e]=t,"s"===e&&(jn.ss=t-1),!0))},c.calendarFormat=function(e,t){var n=e.diff(t,"days",!0);return n<-6?"sameElse":n<-1?"lastWeek":n<0?"lastDay":n<1?"sameDay":n<2?"nextDay":n<7?"nextWeek":"sameElse"},c.prototype=mn,c.HTML5_FMT={DATETIME_LOCAL:"YYYY-MM-DDTHH:mm",DATETIME_LOCAL_SECONDS:"YYYY-MM-DDTHH:mm:ss",DATETIME_LOCAL_MS:"YYYY-MM-DDTHH:mm:ss.SSS",DATE:"YYYY-MM-DD",TIME:"HH:mm",TIME_SECONDS:"HH:mm:ss",TIME_MS:"HH:mm:ss.SSS",WEEK:"GGGG-[W]WW",MONTH:"YYYY-MM"},c});!function(a,i){"use strict";"object"==typeof module&&module.exports?module.exports=i(require("moment")):"function"==typeof define&&define.amd?define(["moment"],i):i(a.moment)}(this,function(c){"use strict";var i,A={},n={},s={},u={};c&&"string"==typeof c.version||L("Moment Timezone requires Moment.js. See https://momentjs.com/timezone/docs/#/use-it/browser/");var a=c.version.split("."),e=+a[0],r=+a[1];function t(a){return 96<a?a-87:64<a?a-29:a-48}function o(a){var i=0,e=a.split("."),r=e[0],o=e[1]||"",c=1,A=0,n=1;for(45===a.charCodeAt(0)&&(n=-(i=1));i<r.length;i++)A=60*A+t(r.charCodeAt(i));for(i=0;i<o.length;i++)c/=60,A+=t(o.charCodeAt(i))*c;return A*n}function m(a){for(var i=0;i<a.length;i++)a[i]=o(a[i])}function f(a,i){var e,r=[];for(e=0;e<i.length;e++)r[e]=a[i[e]];return r}function l(a){var i=a.split("|"),e=i[2].split(" "),r=i[3].split(""),o=i[4].split(" ");return m(e),m(r),m(o),function(a,i){for(var e=0;e<i;e++)a[e]=Math.round((a[e-1]||0)+6e4*a[e]);a[i-1]=1/0}(o,r.length),{name:i[0],abbrs:f(i[1].split(" "),r),offsets:f(e,r),untils:o,population:0|i[5]}}function p(a){a&&this._set(l(a))}function M(a){var i=a.toTimeString(),e=i.match(/\([a-z ]+\)/i);"GMT"===(e=e&&e[0]?(e=e[0].match(/[A-Z]/g))?e.join(""):void 0:(e=i.match(/[A-Z]{3,5}/g))?e[0]:void 0)&&(e=void 0),this.at=+a,this.abbr=e,this.offset=a.getTimezoneOffset()}function b(a){this.zone=a,this.offsetScore=0,this.abbrScore=0}function d(a,i){for(var e,r;r=6e4*((i.at-a.at)/12e4|0);)(e=new M(new Date(a.at+r))).offset===a.offset?a=e:i=e;return a}function h(a,i){return a.offsetScore!==i.offsetScore?a.offsetScore-i.offsetScore:a.abbrScore!==i.abbrScore?a.abbrScore-i.abbrScore:i.zone.population-a.zone.population}function z(a,i){var e,r;for(m(i),e=0;e<i.length;e++)r=i[e],u[r]=u[r]||{},u[r][a]=!0}function E(){try{var a=Intl.DateTimeFormat().resolvedOptions().timeZone;if(a&&3<a.length){var i=s[g(a)];if(i)return i;L("Moment Timezone found "+a+" from the Intl api, but did not have that data loaded.")}}catch(a){}var e,r,o,c=function(){var a,i,e,r=(new Date).getFullYear()-2,o=new M(new Date(r,0,1)),c=[o];for(e=1;e<48;e++)(i=new M(new Date(r,e,1))).offset!==o.offset&&(a=d(o,i),c.push(a),c.push(new M(new Date(a.at+6e4)))),o=i;for(e=0;e<4;e++)c.push(new M(new Date(r+e,0,1))),c.push(new M(new Date(r+e,6,1)));return c}(),A=c.length,n=function(a){var i,e,r,o=a.length,c={},A=[];for(i=0;i<o;i++)for(e in r=u[a[i].offset]||{})r.hasOwnProperty(e)&&(c[e]=!0);for(i in c)c.hasOwnProperty(i)&&A.push(s[i]);return A}(c),t=[];for(r=0;r<n.length;r++){for(e=new b(P(n[r]),A),o=0;o<A;o++)e.scoreOffsetAt(c[o]);t.push(e)}return t.sort(h),0<t.length?t[0].zone.name:void 0}function g(a){return(a||"").toLowerCase().replace(/\//g,"_")}function T(a){var i,e,r,o;for("string"==typeof a&&(a=[a]),i=0;i<a.length;i++)o=g(e=(r=a[i].split("|"))[0]),A[o]=a[i],s[o]=e,z(o,r[2].split(" "))}function P(a,i){a=g(a);var e,r=A[a];return r instanceof p?r:"string"==typeof r?(r=new p(r),A[a]=r):n[a]&&i!==P&&(e=P(n[a],P))?((r=A[a]=new p)._set(e),r.name=s[a],r):null}function S(a){var i,e,r,o;for("string"==typeof a&&(a=[a]),i=0;i<a.length;i++)r=g((e=a[i].split("|"))[0]),o=g(e[1]),n[r]=o,s[r]=e[0],n[o]=r,s[o]=e[1]}function _(a){T(a.zones),S(a.links),B.dataVersion=a.version}function k(a){var i="X"===a._f||"x"===a._f;return!(!a._a||void 0!==a._tzm||i)}function L(a){"undefined"!=typeof console&&"function"==typeof console.error&&console.error(a)}function B(a){var i=Array.prototype.slice.call(arguments,0,-1),e=arguments[arguments.length-1],r=P(e),o=c.utc.apply(null,i);return r&&!c.isMoment(a)&&k(o)&&o.add(r.parse(o),"minutes"),o.tz(e),o}(e<2||2==e&&r<6)&&L("Moment Timezone requires Moment.js >= 2.6.0. You are using Moment.js "+c.version+". See momentjs.com"),p.prototype={_set:function(a){this.name=a.name,this.abbrs=a.abbrs,this.untils=a.untils,this.offsets=a.offsets,this.population=a.population},_index:function(a){var i,e=+a,r=this.untils;for(i=0;i<r.length;i++)if(e<r[i])return i},parse:function(a){var i,e,r,o,c=+a,A=this.offsets,n=this.untils,t=n.length-1;for(o=0;o<t;o++)if(i=A[o],e=A[o+1],r=A[o?o-1:o],i<e&&B.moveAmbiguousForward?i=e:r<i&&B.moveInvalidForward&&(i=r),c<n[o]-6e4*i)return A[o];return A[t]},abbr:function(a){return this.abbrs[this._index(a)]},offset:function(a){return L("zone.offset has been deprecated in favor of zone.utcOffset"),this.offsets[this._index(a)]},utcOffset:function(a){return this.offsets[this._index(a)]}},b.prototype.scoreOffsetAt=function(a){this.offsetScore+=Math.abs(this.zone.utcOffset(a.at)-a.offset),this.zone.abbr(a.at).replace(/[^A-Z]/g,"")!==a.abbr&&this.abbrScore++},B.version="0.5.25",B.dataVersion="",B._zones=A,B._links=n,B._names=s,B.add=T,B.link=S,B.load=_,B.zone=P,B.zoneExists=function a(i){return a.didShowError||(a.didShowError=!0,L("moment.tz.zoneExists('"+i+"') has been deprecated in favor of !moment.tz.zone('"+i+"')")),!!P(i)},B.guess=function(a){return i&&!a||(i=E()),i},B.names=function(){var a,i=[];for(a in s)s.hasOwnProperty(a)&&(A[a]||A[n[a]])&&s[a]&&i.push(s[a]);return i.sort()},B.Zone=p,B.unpack=l,B.unpackBase60=o,B.needsOffset=k,B.moveInvalidForward=!0,B.moveAmbiguousForward=!1;var C,O=c.fn;function N(a){return function(){return this._z?this._z.abbr(this):a.call(this)}}function D(a){return function(){return this._z=null,a.apply(this,arguments)}}c.tz=B,c.defaultZone=null,c.updateOffset=function(a,i){var e,r=c.defaultZone;if(void 0===a._z&&(r&&k(a)&&!a._isUTC&&(a._d=c.utc(a._a)._d,a.utc().add(r.parse(a),"minutes")),a._z=r),a._z)if(e=a._z.utcOffset(a),Math.abs(e)<16&&(e/=60),void 0!==a.utcOffset){var o=a._z;a.utcOffset(-e,i),a._z=o}else a.zone(e,i)},O.tz=function(a,i){if(a){if("string"!=typeof a)throw new Error("Time zone name must be a string, got "+a+" ["+typeof a+"]");return this._z=P(a),this._z?c.updateOffset(this,i):L("Moment Timezone has no data for "+a+". See http://momentjs.com/timezone/docs/#/data-loading/."),this}if(this._z)return this._z.name},O.zoneName=N(O.zoneName),O.zoneAbbr=N(O.zoneAbbr),O.utc=D(O.utc),O.local=D(O.local),O.utcOffset=(C=O.utcOffset,function(){return 0<arguments.length&&(this._z=null),C.apply(this,arguments)}),c.tz.setDefault=function(a){return(e<2||2==e&&r<9)&&L("Moment Timezone setDefault() requires Moment.js >= 2.9.0. You are using Moment.js "+c.version+"."),c.defaultZone=a?P(a):null,c};var y=c.momentProperties;return"[object Array]"===Object.prototype.toString.call(y)?(y.push("_z"),y.push("_a")):y&&(y._z=null),_({version:"2019a",zones:["Africa/Abidjan|GMT|0|0||48e5","Africa/Nairobi|EAT|-30|0||47e5","Africa/Algiers|CET|-10|0||26e5","Africa/Lagos|WAT|-10|0||17e6","Africa/Maputo|CAT|-20|0||26e5","Africa/Cairo|EET EEST|-20 -30|01010|1M2m0 gL0 e10 mn0|15e6","Africa/Casablanca|+00 +01|0 -10|01010101010101010101010101010101|1LHC0 A00 e00 y00 11A0 uM0 e00 Dc0 11A0 s00 e00 IM0 WM0 mo0 gM0 LA0 WM0 jA0 e00 28M0 e00 2600 e00 28M0 e00 2600 gM0 2600 e00 28M0 e00|32e5","Europe/Paris|CET CEST|-10 -20|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|11e6","Africa/Johannesburg|SAST|-20|0||84e5","Africa/Khartoum|EAT CAT|-30 -20|01|1Usl0|51e5","Africa/Sao_Tome|GMT WAT|0 -10|010|1UQN0 2q00","Africa/Tripoli|EET|-20|0||11e5","Africa/Windhoek|CAT WAT|-20 -10|010101010|1LKo0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0|32e4","America/Adak|HST HDT|a0 90|01010101010101010101010|1Lzo0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|326","America/Anchorage|AKST AKDT|90 80|01010101010101010101010|1Lzn0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|30e4","America/Santo_Domingo|AST|40|0||29e5","America/Fortaleza|-03|30|0||34e5","America/Asuncion|-03 -04|30 40|01010101010101010101010|1LEP0 1ip0 17b0 1ip0 19X0 1fB0 19X0 1fB0 19X0 1ip0 17b0 1ip0 17b0 1ip0 19X0 1fB0 19X0 1fB0 19X0 1fB0 19X0 1ip0|28e5","America/Panama|EST|50|0||15e5","America/Mexico_City|CST CDT|60 50|01010101010101010101010|1LKw0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0|20e6","America/Managua|CST|60|0||22e5","America/La_Paz|-04|40|0||19e5","America/Lima|-05|50|0||11e6","America/Denver|MST MDT|70 60|01010101010101010101010|1Lzl0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|26e5","America/Campo_Grande|-03 -04|30 40|01010101010101010101010|1LqP0 1C10 On0 1zd0 On0 1zd0 On0 1zd0 On0 1HB0 FX0 1HB0 FX0 1HB0 IL0 1HB0 FX0 1HB0 IL0 1EN0 FX0 1HB0|77e4","America/Cancun|CST CDT EST|60 50 50|0102|1LKw0 1lb0 Dd0|63e4","America/Caracas|-0430 -04|4u 40|01|1QMT0|29e5","America/Chicago|CST CDT|60 50|01010101010101010101010|1Lzk0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|92e5","America/Chihuahua|MST MDT|70 60|01010101010101010101010|1LKx0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0 14p0 1lb0 14p0 1nX0 11B0 1nX0 11B0 1nX0 14p0 1lb0|81e4","America/Phoenix|MST|70|0||42e5","America/Los_Angeles|PST PDT|80 70|01010101010101010101010|1Lzm0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|15e6","America/New_York|EST EDT|50 40|01010101010101010101010|1Lzj0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|21e6","America/Fort_Nelson|PST PDT MST|80 70 70|0102|1Lzm0 1zb0 Op0|39e2","America/Halifax|AST ADT|40 30|01010101010101010101010|1Lzi0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|39e4","America/Godthab|-03 -02|30 20|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|17e3","America/Grand_Turk|EST EDT AST|50 40 40|0101210101010101010|1Lzj0 1zb0 Op0 1zb0 5Ip0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|37e2","America/Havana|CST CDT|50 40|01010101010101010101010|1Lzh0 1zc0 Oo0 1zc0 Rc0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0 Rc0 1zc0 Oo0 1zc0 Oo0 1zc0 Oo0 1zc0|21e5","America/Metlakatla|PST AKST AKDT|80 90 80|012121201212121212121|1PAa0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 uM0 jB0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|14e2","America/Miquelon|-03 -02|30 20|01010101010101010101010|1Lzh0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|61e2","America/Montevideo|-02 -03|20 30|0101|1Lzg0 1o10 11z0|17e5","America/Noronha|-02|20|0||30e2","America/Port-au-Prince|EST EDT|50 40|010101010101010101010|1Lzj0 1zb0 Op0 1zb0 3iN0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|23e5","Antarctica/Palmer|-03 -04|30 40|01010|1LSP0 Rd0 46n0 Ap0|40","America/Santiago|-03 -04|30 40|010101010101010101010|1LSP0 Rd0 46n0 Ap0 1Nb0 Ap0 1Nb0 Ap0 1zb0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 11B0|62e5","America/Sao_Paulo|-02 -03|20 30|01010101010101010101010|1LqO0 1C10 On0 1zd0 On0 1zd0 On0 1zd0 On0 1HB0 FX0 1HB0 FX0 1HB0 IL0 1HB0 FX0 1HB0 IL0 1EN0 FX0 1HB0|20e6","Atlantic/Azores|-01 +00|10 0|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|25e4","America/St_Johns|NST NDT|3u 2u|01010101010101010101010|1Lzhu 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0 Rd0 1zb0 Op0 1zb0 Op0 1zb0 Op0 1zb0|11e4","Antarctica/Casey|+08 +11|-80 -b0|010|1RWg0 3m10|10","Asia/Bangkok|+07|-70|0||15e6","Pacific/Port_Moresby|+10|-a0|0||25e4","Pacific/Guadalcanal|+11|-b0|0||11e4","Asia/Tashkent|+05|-50|0||23e5","Pacific/Auckland|NZDT NZST|-d0 -c0|01010101010101010101010|1LKe0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1io0 1a00|14e5","Asia/Baghdad|+03|-30|0||66e5","Antarctica/Troll|+00 +02|0 -20|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|40","Asia/Dhaka|+06|-60|0||16e6","Asia/Amman|EET EEST|-20 -30|01010101010101010101010|1LGK0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1o00|25e5","Asia/Kamchatka|+12|-c0|0||18e4","Asia/Baku|+04 +05|-40 -50|01010|1LHA0 1o00 11A0 1o00|27e5","Asia/Barnaul|+07 +06|-70 -60|010|1N7v0 3rd0","Asia/Beirut|EET EEST|-20 -30|01010101010101010101010|1LHy0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0|22e5","Asia/Kuala_Lumpur|+08|-80|0||71e5","Asia/Kolkata|IST|-5u|0||15e6","Asia/Chita|+10 +08 +09|-a0 -80 -90|012|1N7s0 3re0|33e4","Asia/Ulaanbaatar|+08 +09|-80 -90|01010|1O8G0 1cJ0 1cP0 1cJ0|12e5","Asia/Shanghai|CST|-80|0||23e6","Asia/Colombo|+0530|-5u|0||22e5","Asia/Damascus|EET EEST|-20 -30|01010101010101010101010|1LGK0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1nX0|26e5","Asia/Dili|+09|-90|0||19e4","Asia/Dubai|+04|-40|0||39e5","Asia/Famagusta|EET EEST +03|-20 -30 -30|0101012010101010101010|1LHB0 1o00 11A0 1o00 11A0 15U0 2Ks0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00","Asia/Gaza|EET EEST|-20 -30|01010101010101010101010|1LGK0 1nX0 1210 1nz0 1220 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0 11B0 1qL0 WN0 1qL0 WN0 1qL0 WN0 1qL0 11B0 1nX0|18e5","Asia/Hong_Kong|HKT|-80|0||73e5","Asia/Hovd|+07 +08|-70 -80|01010|1O8H0 1cJ0 1cP0 1cJ0|81e3","Asia/Irkutsk|+09 +08|-90 -80|01|1N7t0|60e4","Europe/Istanbul|EET EEST +03|-20 -30 -30|0101012|1LI10 1nA0 11A0 1tA0 U00 15w0|13e6","Asia/Jakarta|WIB|-70|0||31e6","Asia/Jayapura|WIT|-90|0||26e4","Asia/Jerusalem|IST IDT|-20 -30|01010101010101010101010|1LGM0 1oL0 10N0 1oL0 10N0 1rz0 W10 1rz0 W10 1rz0 10N0 1oL0 10N0 1oL0 10N0 1rz0 W10 1rz0 W10 1rz0 10N0 1oL0|81e4","Asia/Kabul|+0430|-4u|0||46e5","Asia/Karachi|PKT|-50|0||24e6","Asia/Kathmandu|+0545|-5J|0||12e5","Asia/Yakutsk|+10 +09|-a0 -90|01|1N7s0|28e4","Asia/Krasnoyarsk|+08 +07|-80 -70|01|1N7u0|10e5","Asia/Magadan|+12 +10 +11|-c0 -a0 -b0|012|1N7q0 3Cq0|95e3","Asia/Makassar|WITA|-80|0||15e5","Asia/Manila|PST|-80|0||24e6","Europe/Athens|EET EEST|-20 -30|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|35e5","Asia/Novosibirsk|+07 +06|-70 -60|010|1N7v0 4eN0|15e5","Asia/Omsk|+07 +06|-70 -60|01|1N7v0|12e5","Asia/Pyongyang|KST KST|-90 -8u|010|1P4D0 6BA0|29e5","Asia/Qyzylorda|+06 +05|-60 -50|01|1Xei0|73e4","Asia/Rangoon|+0630|-6u|0||48e5","Asia/Sakhalin|+11 +10|-b0 -a0|010|1N7r0 3rd0|58e4","Asia/Seoul|KST|-90|0||23e6","Asia/Srednekolymsk|+12 +11|-c0 -b0|01|1N7q0|35e2","Asia/Tehran|+0330 +0430|-3u -4u|01010101010101010101010|1LEku 1dz0 1cp0 1dz0 1cp0 1dz0 1cN0 1dz0 1cp0 1dz0 1cp0 1dz0 1cp0 1dz0 1cN0 1dz0 1cp0 1dz0 1cp0 1dz0 1cp0 1dz0|14e6","Asia/Tokyo|JST|-90|0||38e6","Asia/Tomsk|+07 +06|-70 -60|010|1N7v0 3Qp0|10e5","Asia/Vladivostok|+11 +10|-b0 -a0|01|1N7r0|60e4","Asia/Yekaterinburg|+06 +05|-60 -50|01|1N7w0|14e5","Europe/Lisbon|WET WEST|0 -10|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|27e5","Atlantic/Cape_Verde|-01|10|0||50e4","Australia/Sydney|AEDT AEST|-b0 -a0|01010101010101010101010|1LKg0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0|40e5","Australia/Adelaide|ACDT ACST|-au -9u|01010101010101010101010|1LKgu 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1cM0 1fA0 1cM0|11e5","Australia/Brisbane|AEST|-a0|0||20e5","Australia/Darwin|ACST|-9u|0||12e4","Australia/Eucla|+0845|-8J|0||368","Australia/Lord_Howe|+11 +1030|-b0 -au|01010101010101010101010|1LKf0 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1fAu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1cLu 1cMu 1fzu 1cMu|347","Australia/Perth|AWST|-80|0||18e5","Pacific/Easter|-05 -06|50 60|010101010101010101010|1LSP0 Rd0 46n0 Ap0 1Nb0 Ap0 1Nb0 Ap0 1zb0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1nX0 11B0 1qL0 11B0|30e2","Europe/Dublin|GMT IST|0 -10|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|12e5","Etc/GMT-1|+01|-10|0|","Pacific/Fakaofo|+13|-d0|0||483","Pacific/Kiritimati|+14|-e0|0||51e2","Etc/GMT-2|+02|-20|0|","Pacific/Tahiti|-10|a0|0||18e4","Pacific/Niue|-11|b0|0||12e2","Etc/GMT+12|-12|c0|0|","Pacific/Galapagos|-06|60|0||25e3","Etc/GMT+7|-07|70|0|","Pacific/Pitcairn|-08|80|0||56","Pacific/Gambier|-09|90|0||125","Etc/UTC|UTC|0|0|","Europe/Ulyanovsk|+04 +03|-40 -30|010|1N7y0 3rd0|13e5","Europe/London|GMT BST|0 -10|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|10e6","Europe/Chisinau|EET EEST|-20 -30|01010101010101010101010|1LHA0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00|67e4","Europe/Kaliningrad|+03 EET|-30 -20|01|1N7z0|44e4","Europe/Kirov|+04 +03|-40 -30|01|1N7y0|48e4","Europe/Moscow|MSK MSK|-40 -30|01|1N7y0|16e6","Europe/Saratov|+04 +03|-40 -30|010|1N7y0 5810","Europe/Simferopol|EET MSK MSK|-20 -40 -30|012|1LHA0 1nW0|33e4","Europe/Volgograd|+04 +03|-40 -30|010|1N7y0 9Jd0|10e5","Pacific/Honolulu|HST|a0|0||37e4","MET|MET MEST|-10 -20|01010101010101010101010|1LHB0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00 11A0 1o00 11A0 1qM0 WM0 1qM0 WM0 1qM0 11A0 1o00","Pacific/Chatham|+1345 +1245|-dJ -cJ|01010101010101010101010|1LKe0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1io0 1a00|600","Pacific/Apia|+14 +13|-e0 -d0|01010101010101010101010|1LKe0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1cM0 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1fA0 1a00 1io0 1a00|37e3","Pacific/Bougainville|+10 +11|-a0 -b0|01|1NwE0|18e4","Pacific/Fiji|+13 +12|-d0 -c0|01010101010101010101010|1Lfp0 1SN0 uM0 1SM0 uM0 1VA0 s00 1VA0 s00 1VA0 s00 1VA0 uM0 1SM0 uM0 1VA0 s00 1VA0 s00 1VA0 s00 1VA0|88e4","Pacific/Guam|ChST|-a0|0||17e4","Pacific/Marquesas|-0930|9u|0||86e2","Pacific/Pago_Pago|SST|b0|0||37e2","Pacific/Norfolk|+1130 +11|-bu -b0|01|1PoCu|25e4","Pacific/Tongatapu|+13 +14|-d0 -e0|010|1S4d0 s00|75e3"],links:["Africa/Abidjan|Africa/Accra","Africa/Abidjan|Africa/Bamako","Africa/Abidjan|Africa/Banjul","Africa/Abidjan|Africa/Bissau","Africa/Abidjan|Africa/Conakry","Africa/Abidjan|Africa/Dakar","Africa/Abidjan|Africa/Freetown","Africa/Abidjan|Africa/Lome","Africa/Abidjan|Africa/Monrovia","Africa/Abidjan|Africa/Nouakchott","Africa/Abidjan|Africa/Ouagadougou","Africa/Abidjan|Africa/Timbuktu","Africa/Abidjan|America/Danmarkshavn","Africa/Abidjan|Atlantic/Reykjavik","Africa/Abidjan|Atlantic/St_Helena","Africa/Abidjan|Etc/GMT","Africa/Abidjan|Etc/GMT+0","Africa/Abidjan|Etc/GMT-0","Africa/Abidjan|Etc/GMT0","Africa/Abidjan|Etc/Greenwich","Africa/Abidjan|GMT","Africa/Abidjan|GMT+0","Africa/Abidjan|GMT-0","Africa/Abidjan|GMT0","Africa/Abidjan|Greenwich","Africa/Abidjan|Iceland","Africa/Algiers|Africa/Tunis","Africa/Cairo|Egypt","Africa/Casablanca|Africa/El_Aaiun","Africa/Johannesburg|Africa/Maseru","Africa/Johannesburg|Africa/Mbabane","Africa/Lagos|Africa/Bangui","Africa/Lagos|Africa/Brazzaville","Africa/Lagos|Africa/Douala","Africa/Lagos|Africa/Kinshasa","Africa/Lagos|Africa/Libreville","Africa/Lagos|Africa/Luanda","Africa/Lagos|Africa/Malabo","Africa/Lagos|Africa/Ndjamena","Africa/Lagos|Africa/Niamey","Africa/Lagos|Africa/Porto-Novo","Africa/Maputo|Africa/Blantyre","Africa/Maputo|Africa/Bujumbura","Africa/Maputo|Africa/Gaborone","Africa/Maputo|Africa/Harare","Africa/Maputo|Africa/Kigali","Africa/Maputo|Africa/Lubumbashi","Africa/Maputo|Africa/Lusaka","Africa/Nairobi|Africa/Addis_Ababa","Africa/Nairobi|Africa/Asmara","Africa/Nairobi|Africa/Asmera","Africa/Nairobi|Africa/Dar_es_Salaam","Africa/Nairobi|Africa/Djibouti","Africa/Nairobi|Africa/Juba","Africa/Nairobi|Africa/Kampala","Africa/Nairobi|Africa/Mogadishu","Africa/Nairobi|Indian/Antananarivo","Africa/Nairobi|Indian/Comoro","Africa/Nairobi|Indian/Mayotte","Africa/Tripoli|Libya","America/Adak|America/Atka","America/Adak|US/Aleutian","America/Anchorage|America/Juneau","America/Anchorage|America/Nome","America/Anchorage|America/Sitka","America/Anchorage|America/Yakutat","America/Anchorage|US/Alaska","America/Campo_Grande|America/Cuiaba","America/Chicago|America/Indiana/Knox","America/Chicago|America/Indiana/Tell_City","America/Chicago|America/Knox_IN","America/Chicago|America/Matamoros","America/Chicago|America/Menominee","America/Chicago|America/North_Dakota/Beulah","America/Chicago|America/North_Dakota/Center","America/Chicago|America/North_Dakota/New_Salem","America/Chicago|America/Rainy_River","America/Chicago|America/Rankin_Inlet","America/Chicago|America/Resolute","America/Chicago|America/Winnipeg","America/Chicago|CST6CDT","America/Chicago|Canada/Central","America/Chicago|US/Central","America/Chicago|US/Indiana-Starke","America/Chihuahua|America/Mazatlan","America/Chihuahua|Mexico/BajaSur","America/Denver|America/Boise","America/Denver|America/Cambridge_Bay","America/Denver|America/Edmonton","America/Denver|America/Inuvik","America/Denver|America/Ojinaga","America/Denver|America/Shiprock","America/Denver|America/Yellowknife","America/Denver|Canada/Mountain","America/Denver|MST7MDT","America/Denver|Navajo","America/Denver|US/Mountain","America/Fortaleza|America/Araguaina","America/Fortaleza|America/Argentina/Buenos_Aires","America/Fortaleza|America/Argentina/Catamarca","America/Fortaleza|America/Argentina/ComodRivadavia","America/Fortaleza|America/Argentina/Cordoba","America/Fortaleza|America/Argentina/Jujuy","America/Fortaleza|America/Argentina/La_Rioja","America/Fortaleza|America/Argentina/Mendoza","America/Fortaleza|America/Argentina/Rio_Gallegos","America/Fortaleza|America/Argentina/Salta","America/Fortaleza|America/Argentina/San_Juan","America/Fortaleza|America/Argentina/San_Luis","America/Fortaleza|America/Argentina/Tucuman","America/Fortaleza|America/Argentina/Ushuaia","America/Fortaleza|America/Bahia","America/Fortaleza|America/Belem","America/Fortaleza|America/Buenos_Aires","America/Fortaleza|America/Catamarca","America/Fortaleza|America/Cayenne","America/Fortaleza|America/Cordoba","America/Fortaleza|America/Jujuy","America/Fortaleza|America/Maceio","America/Fortaleza|America/Mendoza","America/Fortaleza|America/Paramaribo","America/Fortaleza|America/Recife","America/Fortaleza|America/Rosario","America/Fortaleza|America/Santarem","America/Fortaleza|Antarctica/Rothera","America/Fortaleza|Atlantic/Stanley","America/Fortaleza|Etc/GMT+3","America/Halifax|America/Glace_Bay","America/Halifax|America/Goose_Bay","America/Halifax|America/Moncton","America/Halifax|America/Thule","America/Halifax|Atlantic/Bermuda","America/Halifax|Canada/Atlantic","America/Havana|Cuba","America/La_Paz|America/Boa_Vista","America/La_Paz|America/Guyana","America/La_Paz|America/Manaus","America/La_Paz|America/Porto_Velho","America/La_Paz|Brazil/West","America/La_Paz|Etc/GMT+4","America/Lima|America/Bogota","America/Lima|America/Eirunepe","America/Lima|America/Guayaquil","America/Lima|America/Porto_Acre","America/Lima|America/Rio_Branco","America/Lima|Brazil/Acre","America/Lima|Etc/GMT+5","America/Los_Angeles|America/Dawson","America/Los_Angeles|America/Ensenada","America/Los_Angeles|America/Santa_Isabel","America/Los_Angeles|America/Tijuana","America/Los_Angeles|America/Vancouver","America/Los_Angeles|America/Whitehorse","America/Los_Angeles|Canada/Pacific","America/Los_Angeles|Canada/Yukon","America/Los_Angeles|Mexico/BajaNorte","America/Los_Angeles|PST8PDT","America/Los_Angeles|US/Pacific","America/Los_Angeles|US/Pacific-New","America/Managua|America/Belize","America/Managua|America/Costa_Rica","America/Managua|America/El_Salvador","America/Managua|America/Guatemala","America/Managua|America/Regina","America/Managua|America/Swift_Current","America/Managua|America/Tegucigalpa","America/Managua|Canada/Saskatchewan","America/Mexico_City|America/Bahia_Banderas","America/Mexico_City|America/Merida","America/Mexico_City|America/Monterrey","America/Mexico_City|Mexico/General","America/New_York|America/Detroit","America/New_York|America/Fort_Wayne","America/New_York|America/Indiana/Indianapolis","America/New_York|America/Indiana/Marengo","America/New_York|America/Indiana/Petersburg","America/New_York|America/Indiana/Vevay","America/New_York|America/Indiana/Vincennes","America/New_York|America/Indiana/Winamac","America/New_York|America/Indianapolis","America/New_York|America/Iqaluit","America/New_York|America/Kentucky/Louisville","America/New_York|America/Kentucky/Monticello","America/New_York|America/Louisville","America/New_York|America/Montreal","America/New_York|America/Nassau","America/New_York|America/Nipigon","America/New_York|America/Pangnirtung","America/New_York|America/Thunder_Bay","America/New_York|America/Toronto","America/New_York|Canada/Eastern","America/New_York|EST5EDT","America/New_York|US/East-Indiana","America/New_York|US/Eastern","America/New_York|US/Michigan","America/Noronha|Atlantic/South_Georgia","America/Noronha|Brazil/DeNoronha","America/Noronha|Etc/GMT+2","America/Panama|America/Atikokan","America/Panama|America/Cayman","America/Panama|America/Coral_Harbour","America/Panama|America/Jamaica","America/Panama|EST","America/Panama|Jamaica","America/Phoenix|America/Creston","America/Phoenix|America/Dawson_Creek","America/Phoenix|America/Hermosillo","America/Phoenix|MST","America/Phoenix|US/Arizona","America/Santiago|Chile/Continental","America/Santo_Domingo|America/Anguilla","America/Santo_Domingo|America/Antigua","America/Santo_Domingo|America/Aruba","America/Santo_Domingo|America/Barbados","America/Santo_Domingo|America/Blanc-Sablon","America/Santo_Domingo|America/Curacao","America/Santo_Domingo|America/Dominica","America/Santo_Domingo|America/Grenada","America/Santo_Domingo|America/Guadeloupe","America/Santo_Domingo|America/Kralendijk","America/Santo_Domingo|America/Lower_Princes","America/Santo_Domingo|America/Marigot","America/Santo_Domingo|America/Martinique","America/Santo_Domingo|America/Montserrat","America/Santo_Domingo|America/Port_of_Spain","America/Santo_Domingo|America/Puerto_Rico","America/Santo_Domingo|America/St_Barthelemy","America/Santo_Domingo|America/St_Kitts","America/Santo_Domingo|America/St_Lucia","America/Santo_Domingo|America/St_Thomas","America/Santo_Domingo|America/St_Vincent","America/Santo_Domingo|America/Tortola","America/Santo_Domingo|America/Virgin","America/Sao_Paulo|Brazil/East","America/St_Johns|Canada/Newfoundland","Antarctica/Palmer|America/Punta_Arenas","Asia/Baghdad|Antarctica/Syowa","Asia/Baghdad|Asia/Aden","Asia/Baghdad|Asia/Bahrain","Asia/Baghdad|Asia/Kuwait","Asia/Baghdad|Asia/Qatar","Asia/Baghdad|Asia/Riyadh","Asia/Baghdad|Etc/GMT-3","Asia/Baghdad|Europe/Minsk","Asia/Bangkok|Antarctica/Davis","Asia/Bangkok|Asia/Ho_Chi_Minh","Asia/Bangkok|Asia/Novokuznetsk","Asia/Bangkok|Asia/Phnom_Penh","Asia/Bangkok|Asia/Saigon","Asia/Bangkok|Asia/Vientiane","Asia/Bangkok|Etc/GMT-7","Asia/Bangkok|Indian/Christmas","Asia/Dhaka|Antarctica/Vostok","Asia/Dhaka|Asia/Almaty","Asia/Dhaka|Asia/Bishkek","Asia/Dhaka|Asia/Dacca","Asia/Dhaka|Asia/Kashgar","Asia/Dhaka|Asia/Qostanay","Asia/Dhaka|Asia/Thimbu","Asia/Dhaka|Asia/Thimphu","Asia/Dhaka|Asia/Urumqi","Asia/Dhaka|Etc/GMT-6","Asia/Dhaka|Indian/Chagos","Asia/Dili|Etc/GMT-9","Asia/Dili|Pacific/Palau","Asia/Dubai|Asia/Muscat","Asia/Dubai|Asia/Tbilisi","Asia/Dubai|Asia/Yerevan","Asia/Dubai|Etc/GMT-4","Asia/Dubai|Europe/Samara","Asia/Dubai|Indian/Mahe","Asia/Dubai|Indian/Mauritius","Asia/Dubai|Indian/Reunion","Asia/Gaza|Asia/Hebron","Asia/Hong_Kong|Hongkong","Asia/Jakarta|Asia/Pontianak","Asia/Jerusalem|Asia/Tel_Aviv","Asia/Jerusalem|Israel","Asia/Kamchatka|Asia/Anadyr","Asia/Kamchatka|Etc/GMT-12","Asia/Kamchatka|Kwajalein","Asia/Kamchatka|Pacific/Funafuti","Asia/Kamchatka|Pacific/Kwajalein","Asia/Kamchatka|Pacific/Majuro","Asia/Kamchatka|Pacific/Nauru","Asia/Kamchatka|Pacific/Tarawa","Asia/Kamchatka|Pacific/Wake","Asia/Kamchatka|Pacific/Wallis","Asia/Kathmandu|Asia/Katmandu","Asia/Kolkata|Asia/Calcutta","Asia/Kuala_Lumpur|Asia/Brunei","Asia/Kuala_Lumpur|Asia/Kuching","Asia/Kuala_Lumpur|Asia/Singapore","Asia/Kuala_Lumpur|Etc/GMT-8","Asia/Kuala_Lumpur|Singapore","Asia/Makassar|Asia/Ujung_Pandang","Asia/Rangoon|Asia/Yangon","Asia/Rangoon|Indian/Cocos","Asia/Seoul|ROK","Asia/Shanghai|Asia/Chongqing","Asia/Shanghai|Asia/Chungking","Asia/Shanghai|Asia/Harbin","Asia/Shanghai|Asia/Macao","Asia/Shanghai|Asia/Macau","Asia/Shanghai|Asia/Taipei","Asia/Shanghai|PRC","Asia/Shanghai|ROC","Asia/Tashkent|Antarctica/Mawson","Asia/Tashkent|Asia/Aqtau","Asia/Tashkent|Asia/Aqtobe","Asia/Tashkent|Asia/Ashgabat","Asia/Tashkent|Asia/Ashkhabad","Asia/Tashkent|Asia/Atyrau","Asia/Tashkent|Asia/Dushanbe","Asia/Tashkent|Asia/Oral","Asia/Tashkent|Asia/Samarkand","Asia/Tashkent|Etc/GMT-5","Asia/Tashkent|Indian/Kerguelen","Asia/Tashkent|Indian/Maldives","Asia/Tehran|Iran","Asia/Tokyo|Japan","Asia/Ulaanbaatar|Asia/Choibalsan","Asia/Ulaanbaatar|Asia/Ulan_Bator","Asia/Vladivostok|Asia/Ust-Nera","Asia/Yakutsk|Asia/Khandyga","Atlantic/Azores|America/Scoresbysund","Atlantic/Cape_Verde|Etc/GMT+1","Australia/Adelaide|Australia/Broken_Hill","Australia/Adelaide|Australia/South","Australia/Adelaide|Australia/Yancowinna","Australia/Brisbane|Australia/Lindeman","Australia/Brisbane|Australia/Queensland","Australia/Darwin|Australia/North","Australia/Lord_Howe|Australia/LHI","Australia/Perth|Australia/West","Australia/Sydney|Australia/ACT","Australia/Sydney|Australia/Canberra","Australia/Sydney|Australia/Currie","Australia/Sydney|Australia/Hobart","Australia/Sydney|Australia/Melbourne","Australia/Sydney|Australia/NSW","Australia/Sydney|Australia/Tasmania","Australia/Sydney|Australia/Victoria","Etc/UTC|Etc/UCT","Etc/UTC|Etc/Universal","Etc/UTC|Etc/Zulu","Etc/UTC|UCT","Etc/UTC|UTC","Etc/UTC|Universal","Etc/UTC|Zulu","Europe/Athens|Asia/Nicosia","Europe/Athens|EET","Europe/Athens|Europe/Bucharest","Europe/Athens|Europe/Helsinki","Europe/Athens|Europe/Kiev","Europe/Athens|Europe/Mariehamn","Europe/Athens|Europe/Nicosia","Europe/Athens|Europe/Riga","Europe/Athens|Europe/Sofia","Europe/Athens|Europe/Tallinn","Europe/Athens|Europe/Uzhgorod","Europe/Athens|Europe/Vilnius","Europe/Athens|Europe/Zaporozhye","Europe/Chisinau|Europe/Tiraspol","Europe/Dublin|Eire","Europe/Istanbul|Asia/Istanbul","Europe/Istanbul|Turkey","Europe/Lisbon|Atlantic/Canary","Europe/Lisbon|Atlantic/Faeroe","Europe/Lisbon|Atlantic/Faroe","Europe/Lisbon|Atlantic/Madeira","Europe/Lisbon|Portugal","Europe/Lisbon|WET","Europe/London|Europe/Belfast","Europe/London|Europe/Guernsey","Europe/London|Europe/Isle_of_Man","Europe/London|Europe/Jersey","Europe/London|GB","Europe/London|GB-Eire","Europe/Moscow|W-SU","Europe/Paris|Africa/Ceuta","Europe/Paris|Arctic/Longyearbyen","Europe/Paris|Atlantic/Jan_Mayen","Europe/Paris|CET","Europe/Paris|Europe/Amsterdam","Europe/Paris|Europe/Andorra","Europe/Paris|Europe/Belgrade","Europe/Paris|Europe/Berlin","Europe/Paris|Europe/Bratislava","Europe/Paris|Europe/Brussels","Europe/Paris|Europe/Budapest","Europe/Paris|Europe/Busingen","Europe/Paris|Europe/Copenhagen","Europe/Paris|Europe/Gibraltar","Europe/Paris|Europe/Ljubljana","Europe/Paris|Europe/Luxembourg","Europe/Paris|Europe/Madrid","Europe/Paris|Europe/Malta","Europe/Paris|Europe/Monaco","Europe/Paris|Europe/Oslo","Europe/Paris|Europe/Podgorica","Europe/Paris|Europe/Prague","Europe/Paris|Europe/Rome","Europe/Paris|Europe/San_Marino","Europe/Paris|Europe/Sarajevo","Europe/Paris|Europe/Skopje","Europe/Paris|Europe/Stockholm","Europe/Paris|Europe/Tirane","Europe/Paris|Europe/Vaduz","Europe/Paris|Europe/Vatican","Europe/Paris|Europe/Vienna","Europe/Paris|Europe/Warsaw","Europe/Paris|Europe/Zagreb","Europe/Paris|Europe/Zurich","Europe/Paris|Poland","Europe/Ulyanovsk|Europe/Astrakhan","Pacific/Auckland|Antarctica/McMurdo","Pacific/Auckland|Antarctica/South_Pole","Pacific/Auckland|NZ","Pacific/Chatham|NZ-CHAT","Pacific/Easter|Chile/EasterIsland","Pacific/Fakaofo|Etc/GMT-13","Pacific/Fakaofo|Pacific/Enderbury","Pacific/Galapagos|Etc/GMT+6","Pacific/Gambier|Etc/GMT+9","Pacific/Guadalcanal|Antarctica/Macquarie","Pacific/Guadalcanal|Etc/GMT-11","Pacific/Guadalcanal|Pacific/Efate","Pacific/Guadalcanal|Pacific/Kosrae","Pacific/Guadalcanal|Pacific/Noumea","Pacific/Guadalcanal|Pacific/Pohnpei","Pacific/Guadalcanal|Pacific/Ponape","Pacific/Guam|Pacific/Saipan","Pacific/Honolulu|HST","Pacific/Honolulu|Pacific/Johnston","Pacific/Honolulu|US/Hawaii","Pacific/Kiritimati|Etc/GMT-14","Pacific/Niue|Etc/GMT+11","Pacific/Pago_Pago|Pacific/Midway","Pacific/Pago_Pago|Pacific/Samoa","Pacific/Pago_Pago|US/Samoa","Pacific/Pitcairn|Etc/GMT+8","Pacific/Port_Moresby|Antarctica/DumontDUrville","Pacific/Port_Moresby|Etc/GMT-10","Pacific/Port_Moresby|Pacific/Chuuk","Pacific/Port_Moresby|Pacific/Truk","Pacific/Port_Moresby|Pacific/Yap","Pacific/Tahiti|Etc/GMT+10","Pacific/Tahiti|Pacific/Rarotonga"]}),c});

/**
 * AUTHSSL HEAD
 */
var AUTHSSL_HEAD = {
    holdReady: function(hold) {
        if ( hold ) { 
            EC$.readyWait++;
        } else { 
            EC$.ready(true);
        } 
    } 
}; 

AUTHSSL_HEAD.holdReady(true);
/**
 * AUTHSSL을 통한 Server to Client 복호화
 */
var AUTHSSL_SC = {
    
    aAppAction : [],
    
    /**
     * 복호화
     * @param sEncrypted 암호화된 값
     */
    decrypt: function(sEncrypted)
    {
        //로딩바 (주문서 작성폼에서만 노출시킨다)
        if (loadContainer.bInitFalg ==false && EC$.inArray('OrderForm',this.aAppAction) > -1) {
            loadContainer.init();
        }

        if (EC$.inArray('OrderForm',this.aAppAction) > -1 && EC$('#authssl_loadingbar').css('display') == 'none') {
            loadContainer.load();
        }

        AuthSSLManager.weave({
            'auth_mode' : 'decryptClient', //mode
            'auth_string' : sEncrypted, //auth_string
            'auth_callbackName'  : 'AUTHSSL_SC.decryptCallbackFn' //callback function
        });
    },

    /**
     * 복호화 콜백함수
     * @param sOutput 복호화된 값
     */
    decryptCallbackFn: function(sOutput)
    {
        var sOutput = decodeURIComponent(sOutput);

        if ( AuthSSLManager.isError(sOutput) == true ) {
            return;
        }

        var aDataAll = AuthSSLManager.unserialize(sOutput);

        // 복호화된 값 각 element에 어싸인
        this.assignByClass(aDataAll['text']);
        this.assignFormById(aDataAll['formDataById']);

        //주문서 작성폼 모듈이 포함된 페이지인경우
        if (EC$.inArray('OrderForm',this.aAppAction) > -1) {
            //로딩바
            setTimeout("loadContainer.remove()",500);
            //주문서작성폼 decrypt일때 호출시킴
            if (typeof(aDataAll['parentModule']) == 'string' && aDataAll['parentModule'] == 'OrderForm') {
                AUTHSSL_HEAD.holdReady(false);
            }
        } else {
            AUTHSSL_HEAD.holdReady(false);
        }
    },

    /**
     * 어싸인 - 일반 텍스트
     * @param aData id => text 배열
     */
    assignByClass: function(aData)
    {
        AUTHSSL_SC.aAuthSSLData = aData;
        for (var sClass in aData) {
            if (aData.hasOwnProperty(sClass)) {
                EC$('.' + sClass).each(function() {
                    var oSpanElement = document.createElement('span');
                    oSpanElement.innerHTML = (aData[sClass]);
                    EC$(this).replaceWith(oSpanElement);
                });
            }
        }
    },

    /**
     * 어싸인 - 입력폼
     * @param aData id => value 배열
     */
    assignFormById: function(aData)
    {
        for (var sId in aData) {
            if (aData[sId] != null && aData[sId] != '') {
                EC$('[id="' + sId + '"]').setValue(aData[sId]);
            }
            if (sId == 'faddress' && EC$("#si_name_f").length > 0) {
                EC$("#ec-shop-address1SpanId_f").text(aData[sId]);
            } else if (sId == 'address_addr1' && EC$("#si_name").length > 0) {
                EC$("#ec-myshop-address1SpanId").text(aData[sId]);
            }
        }
    },
    
    /**
     * 일부 페이지에서만 제어하게끔 세팅 (주문서작성폼에서만 로딩바 노출)
     */
    setAppAction : function(sAppAction) 
    {
        if (sAppAction !='') {
            this.aAppAction.push(sAppAction);
        }
    }
};

/**
 * 로딩바
 */
var loadContainer = {
        
    bInitFalg : false,
    //로딩바 append    
    init : function() {
        var agent = navigator.userAgent.toLowerCase();
        var $window = EC$(window);
        var $body = EC$(document.body);
        var $loadingLayer, $loadingLayerOuter, $loadingLayerText;
        
        if (agent.indexOf('iphone') != -1 || agent.indexOf('android') != -1 || isMobileFuncAuth() === true) {
            $loadingLayer = EC$('<div id="authssl_loadingbar" style="display:none;"></div>').appendTo($body);
            EC$('<div style="z-index:1000; position:fixed; left:0; top:0; right:0; bottom:0; width:100%; height:100%; background-color:#000; "></div>').appendTo($loadingLayer).css("opacity", 0.5);
            $loadingLayerOuter = EC$('<div id="authssl_loadingbar_layer" style="z-index:1010; position:fixed; left:50%; top:50%; width:310px; padding:55px 10px 10px; text-align:center; margin:0 0 0 -155px; background:#fff url(\'//img.echosting.cafe24.com/skin/mobile_ko_KR/common/img_loading.gif\') no-repeat 50% 15px; box-sizing:border-box; border-radius:6px; -webkit-border-top-left-radius:6px; -webkit-border-top-right-radius:6px; -webkit-border-bottom-left-radius:6px; -webkit-border-bottom-right-radius:6px; box-shadow:0 0 8px rgba(0,0,0,0.7);  "></div>').appendTo($loadingLayer);
            $loadingLayerText = EC$('<p style="line-height:1.4; color:#1b1b1b; color:#508bed; font-size:16px; font-weight:bold;"><strong style="display:block;">'+__('개인정보 보호를 위한<br/>암호화 송수신 작업 중입니다.')+'</strong></p>'
                    +'<p style="line-height:1.4; color:#1b1b1b; margin:5px; font-size:13px; color:#757575;">'+__('잠시만 기다려 주십시오.')+'</p>').appendTo($loadingLayerOuter);
        } else {
            $loadingLayer = EC$('<div id="authssl_loadingbar" style="display:none;"></div>').appendTo($body);
            EC$('<div style="z-index:1000; position:fixed; left:0; top:0; right:0; bottom:0; width:100%; height:100%; background-color:#000; "></div>').appendTo($loadingLayer).css("opacity", 0.5);
            $loadingLayerOuter = EC$('<div id="authssl_loadingbar_layer" style="z-index:1010; position:fixed; left:50%; top:50%; width:350px; padding:6px 0 0; margin:0 0 0 -175px; background:url(\'//img.echosting.cafe24.com/skin/base_ko_KR/common/bg_layer_encrypt.png\') no-repeat 0 0; "></div>').appendTo($loadingLayer);
            $loadingLayerText = EC$('<div style="padding:17px 15px 23px; background:url(\'//img.echosting.cafe24.com/skin/base_ko_KR/common/bg_layer_encrypt.png\') repeat-y -360px bottom; ">'
                    +'<span style="display:block; width:32px; height:32px; margin:0 auto; background:url(\'//img.echosting.cafe24.com/skin/base_ko_KR/common/img_loading.gif\') no-repeat 50% 0;"></span>'
                    +'<p style="text-align:center; font-weight:bold; line-height:1.4; margin:15px 0 5px; font-size:18px; color:#000; ">'
                    +'<strong style="display:block; color:#008bc9;">'+__('개인정보 보호를 위한<br/>암호화 송수신 작업 중입니다.')+'</strong></p>'
                    +'<p style="text-align:center; font-weight:bold; line-height:1.4; font-size:14px; color:#7b7b7b;">'+__('잠시만 기다려 주십시오.')+'</p></div>').appendTo($loadingLayerOuter);
        }
        
        this.bInitFalg = true;
    },
    //로딩바 show
    load : function() {
        EC$('#authssl_loadingbar').show();
        //display한후 높이값 가져옴.
        EC$('#authssl_loadingbar_layer').css('margin-top',-(Math.floor(EC$('#authssl_loadingbar_layer').outerHeight()/2))+'px');
        
    },
    //로딩바 hide
    remove : function() {
        EC$('#authssl_loadingbar').hide();
    }
    
};

/**
 * 모바일 여부
 * @returns {Boolean}
 */
function isMobileFuncAuth()
{
    if (window.location.hostname.substr(0, 2) == 'm.' || window.location.hostname.substr(0, 12) == 'mobile--shop' || window.location.hostname.substr(0, 11) == 'skin-mobile') {
        return true;
    } else {
        return false;
    }
}

/**
 * Validator
 *
 */
var utilValidator = {
    // focus 위치 설정 number
    iElementNumber: 0,

    /**
     * 휴대폰 패턴 체크
     * @param string|array mMobile
     * @returns {boolean}
     */
    checkMobile : function(mMobile)
    {
        // 국문몰인경우 유효성체크
        if (SHOP.getLanguage() != 'ko_KR') return true;

        var mobile_number_pattern = /01[016789][0-9]{3,4}[0-9]{4}$/;

        // 초기화
        this.iElementNumber = 0;

        // 유효성 체크
        if (typeof(mMobile) == 'string') {
            if (!mobile_number_pattern.test(mMobile)) return false;
            return true;
        }

        if (typeof(mMobile.mobile2) == 'undefined' || typeof(mMobile.mobile3) == 'undefined') return false;

        var mobile2_pattern = /^\d{3,4}$/;
        var mobile3_pattern = /^\d{4}$/;

        if (!mobile2_pattern.test(mMobile['mobile2'])) {
            // mobile2 focus 위치 하도록 설정
            this.iElementNumber = 2;
            return false;
        }

        if (!mobile3_pattern.test(mMobile['mobile3'])) {
            // mobile3 focus 위치 하도록 설정
            this.iElementNumber = 3;
            return false;
        }

        if (!mobile_number_pattern.test(mMobile.mobile1 + mMobile.mobile2 + mMobile.mobile3)) {

            // mobile1 focus 위치 하도록 설정
            this.iElementNumber = 1;
            return false;
        }
        return true;
    },

    /**
     * 일반전화 패턴 체크
     * @param string|array mPhone
     * @returns {boolean}
     */
    checkPhone : function(mPhone)
    {
        // 국문몰인경우 유효성체크
        if (SHOP.getLanguage() != 'ko_KR') return true;

        // 초기화
        this.iElementNumber = 0;

        var phone_pattern = /^\d{7,8}$/;

        // 유효성 체크
        if (typeof(mPhone) == 'string') {
            if (!phone_pattern.test(mPhone)) return false;
            return true;
        }

        if (typeof(mPhone.phone2) == 'undefined' || typeof(mPhone.phone3) == 'undefined') return false;

        var phone2_pattern = /^\d{3,4}$/;
        var phone3_pattern = /^\d{4}$/;

        if (!phone2_pattern.test(mPhone['phone2'])) {
            // phone2 focus 위치 하도록 설정
            this.iElementNumber = 2;
            return false;
        }

        if (!phone3_pattern.test(mPhone['phone3'])) {
            // phone3 focus 위치 하도록 설정
            this.iElementNumber = 3;
            return false;
        }

        return true;
    }
};
/**
 * Validator
 *
 */
var utilvalidatorJp = {
    // focus 위치 설정 number
    iElementNumber: 0,

    // 일본 국가 코드
    iCountryPhoneCode: 81,

    /**
     * 휴대폰 패턴 체크
     * @param string|array mMobile
     * @returns {boolean}
     */
    checkMobile : function(mMobile)
    {
        // 국문몰 외 유효성체크
        if (SHOP.getLanguage() == 'ko_KR') return true;

        // 일본국가코드 11자리
        var mobile_number_pattern = /^\d{11}$/;

        // 초기화
        this.iElementNumber = 0;

        if (typeof(mMobile.mobile2) == 'undefined') return false;

        // 국가 번호 일본
        if (this.iCountryPhoneCode != mMobile['mobile1']) {

            if (mMobile['mobile1'] == "") {
                this.iElementNumber = 1;
                return false;
            }

            if (mMobile['mobile2'] == "") {
                this.iElementNumber = 2;
                return false;
            }

            if (mMobile['mobile3'] == "") {
                this.iElementNumber = 3;
                return false;
            }

            return true;
        }

        if (!mobile_number_pattern.test(mMobile.mobile2)) {
            // mobile2 focus 위치 하도록 설정
            this.iElementNumber = 2;
            return false;
        }

        return true;
    },

    /**
     * 일반전화 패턴 체크
     * @param string|array mMobile
     * @returns {boolean}
     */
    checkPhone : function(mPhone)
    {
        // 국문몰 외 유효성체크
        if (SHOP.getLanguage() == 'ko_KR') return true;

        // 10~11 자리
        var phone_number_pattern = /^\d{10,11}$/;

        // 초기화
        this.iElementNumber = 0;

        if (typeof(mPhone.phone2) == 'undefined') return false;

        // 국가 번호 일본
        if (this.iCountryPhoneCode != mPhone['phone1']) {

            if (mPhone['phone1'] == "") {
                this.iElementNumber = 1;
                return false;
            }

            if (mPhone['phone2'] == "") {
                this.iElementNumber = 2;
                return false;
            }

            if (mPhone['phone3'] == "") {
                this.iElementNumber = 3;
                return false;
            }

            return true;
        }

        if (!phone_number_pattern.test(mPhone['phone2'])) {
            // phone2 focus 위치 하도록 설정
            this.iElementNumber = 2;
            return false;
        }

        return true;
    }
};
function utilValidatorFactory() {
    this.createValidator = function () {
        var oValidatorObject;

        if (SHOP.getLanguage() == "ko_KR") {
            oValidatorObject = utilValidator;
        } else {
            oValidatorObject = utilvalidatorJp;
        }
        return oValidatorObject;
    };
}
var utilValidatorController = {
    utilvalidator: "",

    init : function() {
        var utilValidatorFactoryObject = new utilValidatorFactory();
        this.utilvalidator = utilValidatorFactoryObject.createValidator();
    },

    isValidatorObject : function() {
        var sReturn = 'T';
        if (this.utilvalidator == undefined || this.utilvalidator == "") {
            this.init();
        }

        if (this.utilvalidator == undefined || this.utilvalidator == "") {
            sReturn = 'F';
        }
        return sReturn;
    },

    existsFunction : function(sMethodName) {
        var sReturn = "F";

        if (typeof this.utilvalidator[sMethodName] === "function") {
            sReturn = "T";
        }
        return sReturn;
    },

    checkMobile : function(mMobile) {
        if (this.isValidatorObject() == "F") {
            return true;
        }

        if (this.existsFunction("checkMobile") == "F") {
            return true;
        }

        return this.utilvalidator.checkMobile(mMobile);
    },

    checkPhone : function(mMobile) {
        if (this.isValidatorObject() == "F") {
            return true;
        }

        if (this.existsFunction("checkPhone") == "F") {
            return true;
        }

        return this.utilvalidator.checkPhone(mMobile);
    },

    getElementNumber : function() {
        if (this.isValidatorObject() == "F") {
            return true;
        }

        return this.utilvalidator.iElementNumber;
    }
};
var EC_ADDR_COMMONFORMAT_FRONT = (function() {
    /**
     * prefix_aAddrInfo 정보들을 하나로 관리
     */
    var aAddrInfo = {};

    /**
     * UI에 노출되어야 할 주소 항목 리스트
     */
    var aAddrFieldsToDisplay = [];

    /**
     * UI에 노출되어야 할 주소 항목들의 순서
     */
    var aAddrOrdering = [];

    /**
     * 모든 주소 항목의 li 엘리먼트 셀렉터
     */
    var aWrapField = [
        'country_wrap', 'baseAddr_wrap', 'detailAddr_wrap',
        'area_wrap', 'state_wrap', 'city_wrap', 'zipcode_wrap'
    ];

    /**
     * 포맷에 정의된 국가 리스트
     */
    var aManagedCountryList = [];

    /* 국가 도메인을 샵 언어로 변경하는 맵 */
    var aCountryDomainToShopLanguage = SHOP.getCountryAndLangMap();

    /**
     * 국제시장 그룹ID
     */
    var sGroupId = 'ADDR.COMMON.FORMAT';

    /**
     * Ajax 호출 완료 여부 (Promise 대신 사용)
     */
    var bAjaxCompleted = false;

    /**
     * 객체가 존재하는지 확인
     */
    var isExistObj = function (obj)
    {
        return !(typeof obj === 'undefined' || obj === '' || obj === null);
    };

    /**
     * 재귀적으로 json의 최종 데이터를 배열로 만들어줌
     * @param mAddrFieldSelector string 혹은 json
     * @param aAllAddrFieldSelector 최종 결과
     * @returns {*}
     */
    var getRecursiveJson = function (mAddrFieldSelector, aAllAddrFieldSelector)
    {
        var jsonAddrField = mAddrFieldSelector;
        try {
            if (typeof (mAddrFieldSelector) === 'string') {
                jsonAddrField = JSON.parse(mAddrFieldSelector);
            }
            for (var sField in jsonAddrField) {
                if (typeof (jsonAddrField[sField]) === 'object') {
                    getRecursiveJson(jsonAddrField[sField], aAllAddrFieldSelector);
                } else {
                    aAllAddrFieldSelector.push(jsonAddrField[sField]);
                }
            }
            return aAllAddrFieldSelector;
        } catch (e) {
            return aAllAddrFieldSelector;
        }
    };

    var init = function ()
    {
        if (typeof common_aAddrInfo === 'undefined' || common_aAddrInfo['sIsRuleBasedAddrForm'] !== 'T') {
            return false;
        }

        var isRuleBasedAddrFormVal = 'F';
        if (!isExistObj(common_aAddrInfo['sIsRuleBasedAddrForm']) || common_aAddrInfo['sIsRuleBasedAddrForm'] === 'F') {
            isRuleBasedAddrFormVal = 'T';
        }
        if (EC$('#__isRuleBasedAddrForm').length > 0) {
            EC$('#__isRuleBasedAddrForm').val(isRuleBasedAddrFormVal);
        }

        aManagedCountryList = Object.keys(common_aAddrInfo.aAllCountryFormat);

        /* 여러개의 prefix_aAddrInfo를 하나의 변수로 담음 */
        for (var idx = 0; idx < common_aAddrInfo.aPageType.length; idx++) {
            var sPageType = common_aAddrInfo.aPageType[idx];
            aAddrInfo[sPageType] = window[sPageType + '_aAddrInfo'];
            aAddrInfo[sPageType]['aAddrFieldSelector'] = JSON.parse(aAddrInfo[sPageType]['aAddrFieldSelector']);

            aAddrInfo[sPageType]['aAllAddrFieldSelector'] = getRecursiveJson(aAddrInfo[sPageType]['aAddrFieldSelector'], []);
            for (var i = 0; i < aWrapField.length; i++) {   /* _wrap 태그들 추가 */
                aAddrInfo[sPageType]['aAllAddrFieldSelector'].push(sPageType + '_' + aWrapField[i]);
            }

            /* 최초 접근시 주소 UI 재배열 및 이벤트 바인딩 */
            setRuleBaseForm(aAddrInfo[sPageType]['sCountryCode'], sPageType, true);
        }
    };


    /**
     * 룰셋 기반으로 주소 폼을 셋팅
     * @param sCountryCode
     * @param sPageType
     * @param bIsInit
     */
    var setRuleBaseForm = function (sCountryCode, sPageType, bIsInit)
    {
        if (!bIsInit) clearAddrField(sPageType);
        /* 해당 국가 주소 포맷 */
        var aCountryRule = getCountryRule(sCountryCode, sPageType, bIsInit);

        rearrangeAddrForm(sCountryCode, sPageType, bIsInit, aCountryRule);
        setAddrFormConfig(sCountryCode, sPageType, aCountryRule);
        setAddrFieldName(sCountryCode);
        eventBinding(sCountryCode, sPageType, bIsInit);
    };

    /**
     * 주소와 관련된 display, hidden 값을 초기화
     * @param sPageType
     */
    var clearAddrField = function (sPageType)
    {
        // display 값 clear
        var aAddrFieldSelector = getRecursiveJson(aAddrInfo[sPageType]['aAddrFieldSelector'], []);
        for (var idx = 0; idx < aAddrFieldSelector.length; idx++) {
            if (aAddrFieldSelector[idx] === aAddrInfo[sPageType]['aAddrFieldSelector']['country']) {
                continue;
            }
            var sAddrFieldSelector = EC$("#" + aAddrFieldSelector[idx]);
            sAddrFieldSelector.val('');
        }

        // hidden clear
        EC$('#__state_name').val('');
        EC$('#__city_name').val('');
        EC$('#__addr1').val('');
        EC$('#__address_addr1').val('');

        var aHiddenAddrInfo = new Array();
        aHiddenAddrInfo['sAddrId'] = '';
        aHiddenAddrInfo['sCityId']  = '';
        aHiddenAddrInfo['sStateId']  = '';
        if (typeof (EC_SHOP_FRONT_ORDERFORM_SHIPPING) !== 'undefined') {
            EC_SHOP_FRONT_ORDERFORM_SHIPPING.proc.setForeignAddress(aHiddenAddrInfo);
            if (aAddrInfo[sPageType].aMarkupSettingData.show_address !== 'F') EC_SHOP_FRONT_ORDERFORM_SHIPPING.exec();
        }
    };

    /**
     * 국가 주소 포맷 정보 얻기
     * @param sCountryCode
     * @param sPageType
     * @param bIsInit
     * @returns {*}
     */
    var getCountryRule = function (sCountryCode, sPageType, bIsInit)
    {
        /* 해당 국가 주소 포맷 */
        var aCountryRule = (isExistObj(common_aAddrInfo.aAllCountryFormat[sCountryCode]) === true)
            ? common_aAddrInfo.aAllCountryFormat[sCountryCode]
            : common_aAddrInfo.aAllCountryFormat['DEFAULT'];

        /* KR인데 해외인 경우 해당 포맷을 갖고옴 */
        if (sCountryCode === 'KR' && aAddrInfo[sPageType]['aMarkupSettingData']['is_foreign'] === 'T') {
            aCountryRule = common_aAddrInfo.aAllCountryFormat['KR_FOREIGN'];
        }

        /* 최초 접근시 기본 국가 선택이 없는 경우 DEFAULT 포맷 갖고옴 */
        if (bIsInit && aAddrInfo[sPageType]['aMarkupSettingData']['country_selected'] === 'F') {
            aCountryRule = common_aAddrInfo.aAllCountryFormat['DEFAULT'];
        }

        return aCountryRule;
    };

    /**
     * 국가 변경시 주소 UI 재배열
     * @param sCountryCode 국가코드
     * @param sPageType 페이지 호출 타입
     * @param bIsInit 최초 호출인지 여부
     * @param aCountryRule 국가 포맷
     */
    var rearrangeAddrForm = function (sCountryCode, sPageType, bIsInit, aCountryRule)
    {
        if (bIsInit) {
            var sIsRuleBasedAddrFormHiddenSelector = EC$('#__isRuleBasedAddrForm');

            if (!isExistObj(common_aAddrInfo) || !isExistObj(common_aAddrInfo['sIsRuleBasedAddrForm']) || common_aAddrInfo['sIsRuleBasedAddrForm'] === 'F') {
                if (sIsRuleBasedAddrFormHiddenSelector.length > 0) {
                    sIsRuleBasedAddrFormHiddenSelector.val('F');
                }
                return;
            } else {
                if (sIsRuleBasedAddrFormHiddenSelector.length > 0) {
                    sIsRuleBasedAddrFormHiddenSelector.val('T');
                }
            }
        }

        if (aAddrInfo[sPageType]['aMarkupSettingData']['show_address'] === 'F') {
            /* 보여지는 항목 외의 부분들 fw-filter 제거 */
            for (var idx = 0; idx < aAddrInfo[sPageType]['aAllAddrFieldSelector'].length; idx++) {
                var sSelector = aAddrInfo[sPageType]['aAllAddrFieldSelector'][idx];
                if (sSelector.indexOf('_wrap') === -1) {
                    EC$('#' + sSelector).attr('fw-filter', '');
                }
            }

            var sAddressWrapSelector = EC$('#ec-' + sPageType + '-address');
            if (sAddressWrapSelector.length > 0) {
                sAddressWrapSelector.addClass('displaynone');
                sAddressWrapSelector.hide();
            }
            return;
        }

        for (var idx = 0; idx < aAddrInfo[sPageType]['aAllAddrFieldSelector'].length; idx++) {
            /* 모든 주소항목을 hidden 및 disabled 처리 */
            var sAddrFieldToHidden = aAddrInfo[sPageType]['aAllAddrFieldSelector'][idx];
            var sAddrFieldToHiddenSelector = EC$('#' + sAddrFieldToHidden);

            sAddrFieldToHiddenSelector.addClass('displaynone');
            sAddrFieldToHiddenSelector.hide();
            if (sAddrFieldToHiddenSelector.prop('type') === 'checkbox') {
                sAddrFieldToHiddenSelector.prop('checked', false);
            }
            if (sAddrFieldToHidden.indexOf('_wrap') === -1) {
                sAddrFieldToHiddenSelector.prop('disabled', true);
            }
        }

        /* 해당 국가 포맷에서 노출되는 주소 항목 목록 및 ordering 필드 셋팅*/
        var aResultFields = getDisplayFieldsAndOrdering(sCountryCode, sPageType, aCountryRule);

        /* 주소 UI 재배열 및 wrap Display 처리 */
        for (var idx = 0; idx < aResultFields['aAddrOrdering'].length; idx++) {
            var sCurrentSelector = EC$('#' + aResultFields['aAddrOrdering'][idx]);
            var sNextSelector = EC$('#' + aResultFields['aAddrOrdering'][idx + 1]);

            if (sCurrentSelector.length > 0) {
                sCurrentSelector.removeClass('displaynone');
                sCurrentSelector.show();
                if (sNextSelector.length > 0) {
                    sNextSelector.insertAfter(sCurrentSelector);
                }
            }
        }

        /* 각 필드들 Display 처리 */
        for (var idx = 0; idx < aResultFields['aAddrFieldsToDisplay'].length; idx++) {
            var sDisplaySelector = EC$('#' + aResultFields['aAddrFieldsToDisplay'][idx]);
            if (sDisplaySelector.length > 0) {
                sDisplaySelector.removeClass('displaynone');
                sDisplaySelector.show();
                sDisplaySelector.prop('disabled', false);
                sDisplaySelector.prop('readonly', false);
            }
        }

        /* 보여지는 항목 외의 부분들 fw-filter 제거 */
        removeFilter(sPageType, aResultFields['aAddrFieldsToDisplay']);
    };

    /**
     * 해당 국가 포맷에서 노출되는 주소 항목 목록 및 ordering 필드 셋팅
     * @param sCountryCode
     * @param sPageType
     * @param aCountryRule
     */
    var getDisplayFieldsAndOrdering = function (sCountryCode, sPageType, aCountryRule)
    {
        var aResultFields = {};

        aAddrFieldsToDisplay = [];
        aAddrOrdering = [];
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var areaRegexp = /city|state|street/;
        var zipcodeRegexp = /zipcode/;

        if (EC$('#ec-' + sPageType + '-address').length > 0) aAddrFieldsToDisplay.push('ec-' + sPageType + '-address');
        for (var idx = 0; idx < aCountryRule['format'].length; idx++) {
            var sField = aCountryRule['format'][idx];
            var sWrap = '';

            if (sField === 'country') { /* 국가 */
                sWrap = sPageType + '_country_wrap';
                aAddrFieldsToDisplay.push(aAddrFieldSelector[sField]);
                aAddrOrdering.push(sWrap);

            } else if (sField === 'baseAddr') { /* 기본 주소 */
                sWrap = sPageType + '_baseAddr_wrap';
                aAddrFieldsToDisplay.push(aAddrFieldSelector[sField]);
                aAddrOrdering.push(sWrap);

            } else if (sField === 'detailAddr') { /* 상세 주소 */
                sWrap = sPageType + '_detailAddr_wrap';
                aAddrFieldsToDisplay.push(aAddrFieldSelector[sField]);
                aAddrOrdering.push(sWrap);

            } else if (sField === 'state') { /* state (Area 아님) */
                sWrap = sPageType + '_state_wrap';
                if (aCountryRule['select'].indexOf(sField) > -1) {
                    aAddrFieldsToDisplay.push(aAddrFieldSelector[sField][sCountryCode]);
                } else {
                    aAddrFieldsToDisplay.push(aAddrFieldSelector[sField]['DEFAULT']);
                }
                aAddrOrdering.push(sWrap);

            } else if (sField === 'city') { /* city (Area 아님) */
                sWrap = sPageType + '_city_wrap';
                aAddrFieldsToDisplay.push(aAddrFieldSelector[sField]['DEFAULT']);
                aAddrOrdering.push(sWrap);

            } else if (areaRegexp.test(sField)) { /* area (무조건 inline) */
                sWrap = sPageType + '_area_wrap';
                var aAreaFields = sField.split('_');
                for (var i = 0; i < aAreaFields.length; i++) {
                    aAddrFieldsToDisplay.push(aAddrFieldSelector[aAreaFields[i]]['AREA']);
                }
                aAddrOrdering.push(sWrap);

            } else if (zipcodeRegexp.test(sField)) { /* 우편번호 */
                sWrap = sPageType + '_zipcode_wrap';
                var aZipcodeFileds = sField.split('_');
                for (var i = 0; i < aZipcodeFileds.length; i++) {
                    aAddrFieldsToDisplay.push(aAddrFieldSelector[aZipcodeFileds[i]]);
                }
                aAddrOrdering.push(sWrap);
            }
        }

        aResultFields['aAddrFieldsToDisplay'] = aAddrFieldsToDisplay;
        aResultFields['aAddrOrdering'] = aAddrOrdering;

        return aResultFields;
    };

    /**
     * 보여지는 항목 외의 부분들 fw-filter 제거
     * @param sPageType
     * @param aAddrFieldsToDisplay
     */
    var removeFilter = function (sPageType, aAddrFieldsToDisplay)
    {
        for (var idx = 0; idx < aAddrInfo[sPageType]['aAllAddrFieldSelector'].length; idx++) {
            var sSelector = aAddrInfo[sPageType]['aAllAddrFieldSelector'][idx];
            if (sSelector.indexOf('_wrap') === -1 && aAddrFieldsToDisplay.indexOf(sSelector) === -1) {
                EC$('#' + sSelector).attr('fw-filter', '');
            }
        }
    };

    /**
     * 각 Row 들의 명칭 국가에 따라서 동적으로 변경
     * @param sCountryCode
     * @param aAddrOrderingParam
     */
    var setAddrFieldName = function (sCountryCode, aAddrOrderingParam)
    {
        /* 관리하는 국가가 아니면 DEFAULT 문구 */
        if (aManagedCountryList.indexOf(sCountryCode) === -1) {
            sCountryCode = 'DEFAULT';
        }

        if (aAddrOrderingParam !== undefined) aAddrOrdering = aAddrOrderingParam;

        for (var idx = 0; idx < aAddrOrdering.length; idx++) {
            var sPlaceholderMessageId = '';
            var sWrapField = aAddrOrdering[idx];
            var sInputInWrapSelector = EC$('#' + sWrapField + ' > input');
            if (EC$('#' + sWrapField).attr('id') === undefined) continue;
            var sField = EC$('#' + sWrapField).attr('id').split('_')[1];

            /* 각 필드들에 필요한 명칭 변경 */
            if (sField === 'baseAddr') { /* 기본 주소 */
                sPlaceholderMessageId = sField.toUpperCase() + '.' + sCountryCode;

                sInputInWrapSelector.attr('placeholder', __(sPlaceholderMessageId, sGroupId));
                sInputInWrapSelector.attr('fw-label', __(sPlaceholderMessageId, sGroupId));

            } else if (sField === 'detailAddr') { /* 상세 주소 */
                sPlaceholderMessageId = sField.toUpperCase() + '.' + sCountryCode;
                var sPlaceholderText = __(sPlaceholderMessageId, sGroupId);

                if (sInputInWrapSelector.attr('fw-filter') !== 'isFill') {
                    var sDetailOptionalMessageId = 'OPTIONAL.' + sCountryCode;
                    sPlaceholderText += __(sDetailOptionalMessageId, sGroupId);
                }
                sInputInWrapSelector.attr('placeholder', sPlaceholderText);
                sInputInWrapSelector.attr('fw-label', sPlaceholderText);

            } else if (sField === 'city') {     /* 도시 */
                sPlaceholderMessageId = sField.toUpperCase() + '.' + sCountryCode;

                sInputInWrapSelector.attr('placeholder', __(sPlaceholderMessageId, sGroupId));
                sInputInWrapSelector.attr('fw-label', __(sPlaceholderMessageId, sGroupId));

            } else if (sField === 'state') { /* state 인풋 태그 */
                sPlaceholderMessageId = sField.toUpperCase() + '.' + sCountryCode;

                sInputInWrapSelector.attr('placeholder', __(sPlaceholderMessageId, sGroupId));
                sInputInWrapSelector.attr('fw-label', __(sPlaceholderMessageId, sGroupId));
            } else if (sField === 'area') { /* city, street 셀렉트박스 (state는 따로 셋팅) */
                var aAreaSelector = EC$('#' + sWrapField + ' > select');

                setSelectList(sCountryCode, 'city', EC$(aAreaSelector[1]));
                setSelectList(sCountryCode, 'street', EC$(aAreaSelector[2]));

            } else if (sField === 'zipcode') { /* 우편번호 버튼, 우편번호 체크박스의 label */
                sPlaceholderMessageId = sField.toUpperCase() + '.' + sCountryCode;
                sInputInWrapSelector.attr('placeholder', __(sPlaceholderMessageId, sGroupId));
                sInputInWrapSelector.attr('fw-label', __(sPlaceholderMessageId, sGroupId));

                var sZipcodeBtnSelector = EC$('#' + sWrapField + ' > button');
                var sFieldMessageId = 'ZIPCODEBTN.' + sCountryCode;
                sZipcodeBtnSelector.html(__(sFieldMessageId, sGroupId));

                var sZipcodeLabelSelector = EC$('#' + sWrapField + ' > span > label');
                sFieldMessageId = 'ZIPCODECHECK.' + sCountryCode;
                sZipcodeLabelSelector.html(__(sFieldMessageId, sGroupId));
            } else if (sField === 'country') {
                sPlaceholderMessageId = sField.toUpperCase() + '.' + sCountryCode;
                EC$('#' + sWrapField + ' > select').attr('fw-label', __(sPlaceholderMessageId, sGroupId));
            }
        }
    };

    /**
     * 해당 룰 포맷의 설정 셋팅
     * @param sCountryCode
     * @param sPageType
     * @param aRuleFormat
     */
    var setAddrFormConfig = function (sCountryCode, sPageType, aRuleFormat)
    {
        /* 해외 배송 주문서 대만 국가 QR 코드 */
        setConfigExtraMarkup(sPageType);

        /* readonly 설정 */
        setConfigReadonly(aRuleFormat, sPageType);

        /* checked 설정 */
        setConfigChecked(aRuleFormat, sPageType);

        /* disabled 설정 */
        setConfigDisabled(aRuleFormat, sPageType);

        /* 해당 국가의 State 리스트를 셋팅합니다. */
        setConfigStateList(sCountryCode, sPageType);

        /* 해당 국가의 주소 검색 포맷의 select 박스 여부 확인 */
        setConfigIsAreaAddr(sPageType, aRuleFormat);

        /* 보여지는 항목들 required 셋팅 */
        setConfigRequiredFields(sCountryCode, sPageType, aRuleFormat);
    };

    /**
     * 해외 배송 주문서 대만 국가 QR 코드
     * @param sPageType
     */
    var setConfigExtraMarkup = function (sPageType)
    {
        if (EC$('#ec-shippingInfo-help').length > 0) {
            EC$('#ec-shippingInfo-help').insertAfter(EC$('#' + sPageType + '_country_wrap'));
        }
    };

    /**
     * readonly 설정
     * @param aRuleFormat
     * @param sPageType
     */
    var setConfigReadonly = function (aRuleFormat, sPageType)
    {
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var aReadonlyFields = aRuleFormat['readonly'];

        if (isExistObj(aReadonlyFields)) {
            for (var i = 0; i < aReadonlyFields.length; i++) {
                var aReadonlySelector = EC$('#' + aAddrFieldSelector[aReadonlyFields[i]]);
                if (aReadonlySelector.length > 0) {
                    aReadonlySelector.prop('readonly', true);
                }
            }
        }
    };

    /**
     * checked 설정
     * @param aRuleFormat
     * @param sPageType
     */
    var setConfigChecked = function (aRuleFormat, sPageType)
    {
        /* 룰셋 포맷에 chekced가 정의된 경우 */
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var aCheckedFields = aRuleFormat['checked'];
        if (typeof (EC_SHOP_FRONT_ORDERFORM_DATA) === 'object') {   // 주문서 데이터 처리
            EC_SHOP_FRONT_ORDERFORM_DATA.form.sIsNoReceiveZipcode = 'F';
        }
        if (isExistObj(aCheckedFields)) {
            for (var i = 0; i < aCheckedFields.length; i++) {
                var aReadonlySelector = EC$('#' + aAddrFieldSelector[aCheckedFields[i]]);
                if (aReadonlySelector.length > 0) {
                    aReadonlySelector.prop('checked', true);
                    /* 주문서 데이터 처리 */
                    if (typeof (EC_SHOP_FRONT_ORDERFORM_DATA) === 'object') EC_SHOP_FRONT_ORDERFORM_DATA.form.sIsNoReceiveZipcode = 'T';
                }
            }
        }

        /* 설정 정보에 chekced가 정의된 경우 */
        var aMarkupSettingData = aAddrInfo[sPageType].aMarkupSettingData;
        if (isExistObj(aMarkupSettingData) && aMarkupSettingData['uncheck_zipcode'] === 'T') {
            EC$("#" + aAddrFieldSelector['zipcodeCheck']).prop('checked', true);
        }
    };

    /**
     * disabled 설정
     * @param aRuleFormat
     * @param sPageType
     */
    var setConfigDisabled = function (aRuleFormat, sPageType)
    {
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var aDisabledFields = aRuleFormat['disabled'];

        if (isExistObj(aDisabledFields)) {
            for (var i = 0; i < aDisabledFields.length; i++) {
                var aReadonlySelector = EC$('#' + aAddrFieldSelector[aDisabledFields[i]]);
                if (aReadonlySelector.length > 0) {
                    aReadonlySelector.prop('disabled', true);
                }
            }
        }
    };

    /**
     * 우편번호 inputbox의 disblaed와 checkbox의 checked를 해제
     * @param sPageType
     */
    var unblockedZipcodeField = function (sPageType)
    {
        var sZipcodeInputSelector = EC$("#" + aAddrInfo[sPageType].aAddrFieldSelector.zipcode);
        var sZipcodeCheckSelector = EC$("#" + aAddrInfo[sPageType].aAddrFieldSelector.zipcodeCheck);

        sZipcodeInputSelector.prop('disabled', false);
        sZipcodeCheckSelector.prop('checked', false);
    };

    /**
     * 해당 국가의 State 리스트를 셋팅합니다.
     * @param sCountryCode
     * @param sPageType
     */
    var setConfigStateList = function (sCountryCode, sPageType)
    {
        /* 관리하는 국가가 아니면 DEFAULT 문구 */
        var sMessageId = sCountryCode;
        if (aManagedCountryList.indexOf(sCountryCode) === -1) {
            sMessageId = 'DEFAULT';
        }

        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var aStateList = common_aAddrInfo.aAllStateList[sCountryCode];

        if (isExistObj(aStateList) === true) {
            var sStateSelector = aAddrFieldSelector['state'][sCountryCode];
            if (isExistObj(sStateSelector) === false) {
                sStateSelector = aAddrFieldSelector['state']['AREA'];
            }
            sStateSelector = EC$('#' + sStateSelector);
            sStateSelector.attr('fw-label', __('STATE.' + sMessageId, sGroupId));
            var aAddressSelectCallParams = {
                sLanguage: sCountryCode,
                si_name: '',
                ci_name: '',
                gu_name: ''
            };
            emptyArea(aAddressSelectCallParams, 'state', aAddrFieldSelector, sCountryCode);
            setSelectList(sCountryCode, 'state', sStateSelector, aStateList);
        }
    };

    /**
     * selectbox로 주소 검색하는지 여부 셋팅
     * sIsTwoSelectInArea : 셀렉트 박스 2개 (ex 대만)
     * sIsThreeSelectInArea : 셀렉트 박스 3개 (ex : 중국,베트남)
     * @param sPageType
     * @param aRuleFormat
     */
    var setConfigIsAreaAddr = function (sPageType, aRuleFormat)
    {
        if (isExistObj(aRuleFormat) === false) return;

        var aIsAreaAddr = {
            'sIsAreaAddr' : 'F',
            'sIsTwoSelectInArea' : 'F',
            'sIsThreeSelectInArea' : 'F'
        };

        var iAreaCnt = 0;
        var areaRegexp = /city|state|street/;
        if (isExistObj(aRuleFormat['select'])) {
            for (var i = 0; i < aRuleFormat['select'].length; i++) {
                if (areaRegexp.test(aRuleFormat['select'][i])) {
                    iAreaCnt++;
                }
            }
        }

        if (iAreaCnt === 2) {
            aIsAreaAddr['sIsAreaAddr'] = 'T';
            aIsAreaAddr['sIsTwoSelectInArea'] = 'T';
        } else if (iAreaCnt === 3) {
            aIsAreaAddr['sIsAreaAddr'] = 'T';
            aIsAreaAddr['sIsThreeSelectInArea'] = 'T';
        }

        EC_ADDR_COMMONFORMAT_FRONT['aAddrInfo'][sPageType]['aIsAreaAddr'] = aIsAreaAddr;
    };

    /**
     * 보여지는 항목들 중 필수 항목은 fw-filter에서 isFill 셋팅 (우편번호 제외)
     * @param sCountryCode
     * @param sPageType
     * @param aRuleFormat
     */
    var setConfigRequiredFields = function (sCountryCode, sPageType, aRuleFormat)
    {
        if (aAddrInfo[sPageType]['aMarkupSettingData']['show_address'] === 'F') return;

        var aDisplayFields = getDisplayFieldsAndOrdering(sCountryCode, sPageType, aRuleFormat)['aAddrFieldsToDisplay'];
        var aRequiredFields = aAddrInfo[sPageType]['aMarkupSettingData']['required_fields'];

        if (aDisplayFields.length < 1 ||
            aRequiredFields === undefined || aRequiredFields.length < 1) return;

        var aIsAreaAddr = getConfigIsAreaAddr(sPageType);
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];

        for (var i = 0; i < aRequiredFields.length; i++) {
            var sSelectField = aAddrFieldSelector[aRequiredFields[i]];
            if (sSelectField === undefined) continue;
            if (typeof (sSelectField) === 'string' && aRequiredFields[i] !== 'zipcode') {
                if (aDisplayFields.indexOf(sSelectField) > -1) EC$('#' + sSelectField).attr('fw-filter', 'isFill');
            } else { /* city, state, street */
                if (aIsAreaAddr.sIsAreaAddr === 'F') { /* 기본주소 검색이 select가 아님 */
                    if (sSelectField[sCountryCode] !== undefined) {
                        if (aDisplayFields.indexOf(sSelectField[sCountryCode]) > -1) EC$('#' + sSelectField[sCountryCode]).attr('fw-filter', 'isFill');
                    } else { /* 특정 국가의 필드가 있음 */
                        if (aDisplayFields.indexOf(sSelectField['DEFAULT']) > -1) EC$('#' + sSelectField['DEFAULT']).attr('fw-filter', 'isFill');
                    }
                } else { /* 기본주소 검색이 select 박스 */
                    if (aDisplayFields.indexOf(sSelectField['AREA']) > -1) EC$('#' + sSelectField['AREA']).attr('fw-filter', 'isFill');
                }
            }
        }
    };

    /**
     * selectbox로 주소 검색하는지 여부 조회
     * @param sPageType
     * @returns {boolean|*}
     */
    var getConfigIsAreaAddr = function (sPageType)
    {
        if (isExistObj(common_aAddrInfo) === false || common_aAddrInfo['sIsRuleBasedAddrForm'] !== 'T' ||
            isExistObj(EC_ADDR_COMMONFORMAT_FRONT['aAddrInfo'][sPageType]) === false ||
            isExistObj(EC_ADDR_COMMONFORMAT_FRONT['aAddrInfo'][sPageType]['aIsAreaAddr']) === false
        ) {
            return false;
        }

        return EC_ADDR_COMMONFORMAT_FRONT['aAddrInfo'][sPageType]['aIsAreaAddr'];
    };

    /**
     * 이벤트 바인딩
     */
    var eventBinding = function (sCountryCode, sPageType, bIsInit)
    {
        /* 국가 selectbox 이벤트 바인딩 (해당 페이지 접근시 최초 한번만 바인딩) */
        changeCountryEvent(sCountryCode, sPageType, bIsInit);

        /* 우편번호 검색버튼 바인딩 (국가 변경될 때마다) */
        clickZipcodeBtnEvent(sCountryCode, sPageType);

        /* 우편번호 체크박스 변경시 이벤트 바인딩 (국가 변경될 때마다) */
        clickZipcodeCheckEvent(sPageType);

        /* Area 항목 변경시 이벤트 바인딩 (국가 변경될 때마다) */
        changeAreaStateEvent(sCountryCode, sPageType, bIsInit);     // State
        changeAreaCityEvent(sCountryCode, sPageType, bIsInit);      // City
        changeAreaStreetEvent(sCountryCode, sPageType, bIsInit);    // Street
    };

    /**
     * 국가 selectbox 이벤트 바인딩 (해당 페이지 접근시 최초 한번만 바인딩)
     * @param sCountryCode
     * @param sPageType
     * @param bIsInit
     */
    var changeCountryEvent = function (sCountryCode, sPageType, bIsInit)
    {
        if (bIsInit) {
            var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
            var sCountrySelector = EC$('#' + aAddrFieldSelector['country']);
            if (sCountrySelector.length > 0) {
                sCountrySelector.change(function () {
                    var sChangeCountryCode = this.options[this.selectedIndex].value;
                    /* 주소 폼 재셋팅 */
                    setRuleBaseForm(sChangeCountryCode, sPageType, false);
                });
            }
        }
    };

    /**
     * 우편번호 검색버튼 바인딩 (국가 변경될 때마다)
     * @param sCountryCode
     * @param sPageType
     */
    var clickZipcodeBtnEvent = function (sCountryCode, sPageType)
    {
        var sType = 'layer';
        if (typeof EC_MOBILE_DEVICE !== 'undefined' && EC_MOBILE_DEVICE === true) {
            sType = 'mobile';
        }

        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        if (!isExistObj(aAddrFieldSelector['zipcodeBtn'])) return;

        var sZipcodeBtnSelector = '#' + aAddrFieldSelector['zipcodeBtn'];
        if (EC$(sZipcodeBtnSelector).length > 0 && aCountryDomainToShopLanguage[sCountryCode] !== undefined){
            /* 중복 이벤트 방지 unbind */
            EC$(sZipcodeBtnSelector + ' img').attr('src', EC$(sZipcodeBtnSelector + ' img').attr('off'));
            EC$(sZipcodeBtnSelector).off('click').css('cursor', 'unset');

            /* 우편번호 찾기 버튼 이벤트 바인딩 */
            EC$(sZipcodeBtnSelector + ' img').attr('src', EC$(sZipcodeBtnSelector + ' img').attr('on'));
            EC$(sZipcodeBtnSelector).on('click', {
                'zipId1': aAddrFieldSelector['zipcode'],
                'zipId2': '',
                'addrId': aAddrFieldSelector['baseAddr'],
                'cityId': aAddrFieldSelector['city']['DEFAULT'],
                'stateId': aAddrFieldSelector['state']['DEFAULT'],
                'type': sType,
                'sFixCountry' : aCountryDomainToShopLanguage[sCountryCode],
                'sLanguage': aCountryDomainToShopLanguage[sCountryCode],
                'addrId2': aAddrFieldSelector['detailAddr']
            }, ZipcodeFinder.Opener.Event.onClickBtnPopup).css('cursor', 'pointer');
        }
    };

    /**
     * 우편번호 없음 체크버튼 바인딩 (국가 변경될 때마다)
     * @param sPageType
     */
    var clickZipcodeCheckEvent = function (sPageType)
    {
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        if (!isExistObj(aAddrFieldSelector['zipcodeCheck'])) return;

        var sZipcodeSelector = '#' + aAddrFieldSelector['zipcode'];
        var sZipcodeCheckSelector = '#' + aAddrFieldSelector['zipcodeCheck'];

        EC$(sZipcodeCheckSelector).off('change').css('cursor', 'unset');
        EC$(sZipcodeCheckSelector).on('change', function() {
            if (EC$(this).is(':checked') === true) {
                EC$(sZipcodeSelector).val('');
                EC$(sZipcodeSelector).prop("disabled", true);
                if (typeof (EC_SHOP_FRONT_ORDERFORM_DATA) === 'object') EC_SHOP_FRONT_ORDERFORM_DATA.form.sIsNoReceiveZipcode = 'T';
            } else {
                EC$(sZipcodeSelector).prop('disabled', false);
                if (typeof (EC_SHOP_FRONT_ORDERFORM_DATA) === 'object') EC_SHOP_FRONT_ORDERFORM_DATA.form.sIsNoReceiveZipcode = 'F';
            }

            if (typeof (EC_SHOP_FRONT_ORDERFORM_SHIPPING) != 'undefined') {
                EC_SHOP_FRONT_ORDERFORM_SHIPPING.exec();
            }
        });
    };

    /**
     * Area의 State 변경시 이벤트 바인딩 (국가 변경될 때마다)
     * @param sCountryCode
     * @param sPageType
     * @param bIsInit
     */
    var changeAreaStateEvent = function (sCountryCode, sPageType, bIsInit)
    {
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        if (!isExistObj(aAddrFieldSelector['state']) || !isExistObj(aAddrFieldSelector['state']['AREA'])) {
            return;
        }

        var sStateSelector = EC$('#' + aAddrFieldSelector['state']['AREA']);
        if (sStateSelector.length > 0 && aCountryDomainToShopLanguage[sCountryCode] !== undefined) {
            /* 바인딩 이벤트 최초 접근이 아니면 해당 메소드만 언바인딩 */
            if (!bIsInit) {
                sStateSelector.off('change.changeAreaState');
            }

            sStateSelector.on('change.changeAreaState', function () {
                var aAddressSelectCallParams = {
                    sLanguage: aCountryDomainToShopLanguage[sCountryCode],
                    si_name: this.options[this.selectedIndex].value,
                    ci_name: '',
                    gu_name: ''
                };

                var bSetupResult = setUpNextAddrSelectbox(aAddressSelectCallParams, 'state', aAddrFieldSelector, sCountryCode);
                if (bSetupResult === false) {
                    EC$('#__state_name').val('');
                    EC$('#__city_name').val('');
                    EC$('#__addr1').val('');
                    EC$('#'+aAddrFieldSelector['baseAddr']).val('');
                }
            });
        }
    };

    /**
     * Area의 City 변경시 이벤트 바인딩 (국가 변경될 때마다)
     * @param sCountryCode
     * @param sPageType
     * @param bIsInit
     */
    var changeAreaCityEvent = function (sCountryCode, sPageType, bIsInit)
    {
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        if (!isExistObj(aAddrFieldSelector['state']) || !isExistObj(aAddrFieldSelector['state']['AREA'])) {
            return;
        }
        if (!isExistObj(aAddrFieldSelector['city']) || !isExistObj(aAddrFieldSelector['city']['AREA'])) {
            return;
        }

        var sStateSelector = EC$('#' + aAddrFieldSelector['state']['AREA']);
        var sCitySelector = EC$('#' + aAddrFieldSelector['city']['AREA']);
        if (sCitySelector.length > 0 && aCountryDomainToShopLanguage[sCountryCode] !== undefined) {
            /* 바인딩 이벤트 최초 접근이 아니면 해당 메소드만 언바인딩 */
            if (!bIsInit) {
                sCitySelector.off('change.changeAreaCity');
            }

            sCitySelector.on('change.changeAreaCity', function () {
                var aAddressSelectCallParams = {
                    sLanguage: aCountryDomainToShopLanguage[sCountryCode],
                    si_name: sStateSelector.val(),
                    ci_name: this.options[this.selectedIndex].value,
                    gu_name: ''
                };

                var bSetupResult = setUpNextAddrSelectbox(aAddressSelectCallParams, 'city', aAddrFieldSelector, sCountryCode);
                if (bSetupResult === false) {
                    EC$('#__city_name').val('');
                    EC$('#__addr1').val('');
                    EC$('#'+aAddrFieldSelector['baseAddr']).val('');
                }
            });
        }
    };

    /**
     * Area의 Street 변경시 이벤트 바인딩 (국가 변경될 때마다)
     * @param sCountryCode
     * @param sPageType
     * @param bIsInit
     */
    var changeAreaStreetEvent = function (sCountryCode, sPageType, bIsInit)
    {
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        if (!isExistObj(aAddrFieldSelector['state']) || !isExistObj(aAddrFieldSelector['state']['AREA'])) {
            return;
        }
        if (!isExistObj(aAddrFieldSelector['city']) || !isExistObj(aAddrFieldSelector['city']['AREA'])) {
            return;
        }
        if (!isExistObj(aAddrFieldSelector['street']) || !isExistObj(aAddrFieldSelector['street']['AREA'])) {
            return;
        }

        var sStateSelector = EC$('#' + aAddrFieldSelector['state']['AREA']);
        var sCitySelector = EC$('#' + aAddrFieldSelector['city']['AREA']);
        var sStreetSelector = EC$('#' + aAddrFieldSelector['street']['AREA']);
        if (sStreetSelector.length > 0 && aCountryDomainToShopLanguage[sCountryCode] !== undefined) {
            /* 바인딩 이벤트 최초 접근이 아니면 해당 메소드만 언바인딩 */
            if (!bIsInit) {
                sStreetSelector.off('change.changeAreaStreet');
            }

            sStreetSelector.on('change.changeAreaStreet', function () {
                var aAddressSelectCallParams = {
                    sLanguage: aCountryDomainToShopLanguage[sCountryCode],
                    si_name: sStateSelector.val(),
                    ci_name: aAddrFieldsToDisplay.indexOf(aAddrFieldSelector['city']['AREA'] > -1) ? sCitySelector.val() : '',
                    gu_name: this.options[this.selectedIndex].value
                };

                var bSetupResult = setUpNextAddrSelectbox(aAddressSelectCallParams, 'street', aAddrFieldSelector, sCountryCode);
                if (bSetupResult === false) {
                    EC$('#__addr1').val('');
                    EC$('#'+aAddrFieldSelector['baseAddr']).val('');
                    return;
                }

                // 우편번호 셋팅을 Ajax로 하다보니, 배송비 구하는게 먼저 수행되고 우편번호가 나중에 셋팅됨
                // 그래서 우편번호를 통한 지역별 배송비가 구해지지 않음 (ECHOSTING-382468)
                var AddrInterval = setInterval(function() {
                    if (bAjaxCompleted === true) {
                        setAddrHiddenBundle(sCountryCode, sPageType);
                        bAjaxCompleted = false;
                        clearInterval(AddrInterval);
                    }
                }, 500);
            });
        }
    };

    /**
     * Area에서 선택한 주소 항목 값을 기준으로 다음 주소 항목 Select 리스트를 셋팅합니다.
     * ex) state 선택시, city 항목 리스트를 불러옴
     *
     * @param aAddressSelectCallParams
     * @param sCurrentField
     * @param aAddrFieldSelector
     * @param sCountryCode
     */
    var setUpNextAddrSelectbox = function(aAddressSelectCallParams, sCurrentField, aAddrFieldSelector, sCountryCode)
    {
        bAjaxCompleted = false;
        /* state, city, street 초기화 */
        if (emptyArea(aAddressSelectCallParams, sCurrentField, aAddrFieldSelector, sCountryCode)) {
            return false;
        }

        var sUrl = '/exec/common/zipcode/find/';

        EC$.ajax({
            type: 'post',
            url: sUrl,
            data: aAddressSelectCallParams,
            success: function (response) {
                var aResData = response.data;

                if (isExistObj(aResData) === false) {
                    return false;
                }

                if (sCurrentField !== 'street') {
                    var sSelector = '';
                    var sNextSelector = '';
                    var sNextField = '';
                    var sAfterNextField = '';

                    if (sCurrentField === 'state' && aAddrFieldsToDisplay.indexOf(aAddrFieldSelector['city']['AREA']) > -1) {
                        sSelector = EC$('#' + aAddrFieldSelector['city']['AREA']);
                        sNextSelector = EC$('#' + aAddrFieldSelector['street']['AREA']);
                        sNextField = 'city';
                        sAfterNextField = 'street';
                    } else {
                        sSelector = EC$('#' + aAddrFieldSelector['street']['AREA']);
                        sNextField = 'street';
                    }

                    sSelector.empty();
                    sSelector.append('<option value="">' + __('SELECT.'+sNextField.toUpperCase()+'.'+sCountryCode, sGroupId) + '</option>');
                    if (isExistObj(sNextSelector)) {
                        sNextSelector.empty();
                        sNextSelector.append('<option value="">' + __('SELECT.'+sAfterNextField.toUpperCase()+'.'+sCountryCode, sGroupId) + '</option>');
                    }

                    for (var sKey in aResData) {
                        var sVal = Object.keys(aResData[sKey]).map(function(e) {
                            return aResData[sKey][e];
                        });

                        if (isExistObj(sVal[0]) === false) {
                            continue;
                        }
                        sOptionMarkup = "<option value='" + sVal +"'>" + sVal + "</option>";
                        sSelector.append(sOptionMarkup);
                    }
                } else {
                    sSelector = EC$('#' + aAddrFieldSelector['zipcode']);
                    sSelector.val(aResData[0].zipcode);
                }

                bAjaxCompleted = true;
                return true;
            }
        });
    };

    /**
     * state, city, street 초기화
     * @param aAddressSelectCallParams
     * @param sCurrentField
     * @param aAddrFieldSelector
     * @param sCountryCode
     */
    var emptyArea = function(aAddressSelectCallParams, sCurrentField, aAddrFieldSelector, sCountryCode)
    {
        var sAreaCitySelector = EC$('#' + aAddrFieldSelector['city']['AREA']);
        var sAreaStreetSelector = EC$('#' + aAddrFieldSelector['street']['AREA']);

        if (sCurrentField === 'state' && aAddressSelectCallParams['si_name'] === '') {
            if (sAreaCitySelector.length > 0) {
                sAreaCitySelector.empty();
                sAreaCitySelector.append('<option value="">' + __('SELECT.CITY.'+sCountryCode, sGroupId) + '</option>');
            }

            if (sAreaStreetSelector.length > 0) {
                sAreaStreetSelector.empty();
                sAreaStreetSelector.append('<option value="">' + __('SELECT.STREET.'+sCountryCode, sGroupId) + '</option>');
            }
            return true;
        } else if (sCurrentField === 'city' && aAddressSelectCallParams['ci_name'] === '') {
            if (sAreaStreetSelector.length > 0) {
                sAreaStreetSelector.empty();
                sAreaStreetSelector.append('<option value="">' + __('SELECT.STREET.'+sCountryCode, sGroupId) + '</option>');
            }
            return true;
        }
        return false;
    };

    /**
     * Select 주소 검색을 하는 항목에 대해서, 저장된 값을 selected 합니다.
     * 주소 리스트를 보여주기 위해 주소 검색 ajax 호출
     * @param aAddressSelectCallParams
     * @param sSelector
     * @param sHiddenData
     * @param sCountryCode
     * @param sCurrentField
     */
    var setUpAddrSelected = function(aAddressSelectCallParams, sSelector, sHiddenData, sCountryCode, sCurrentField)
    {
        var sUrl = '/exec/common/zipcode/find/';

        EC$.ajax({
            type: 'post',
            url: sUrl,
            data: aAddressSelectCallParams,
            success: function (response) {
                var aResData = response.data;

                if (isExistObj(aResData) === false) {
                    return false;
                }

                sSelector.empty();
                sSelector.append('<option value="">' + __('SELECT.'+sCurrentField.toUpperCase()+'.'+sCountryCode, sGroupId) + '</option>'); // unselected 문구
                for (var sKey in aResData) {
                    var sVal = Object.keys(aResData[sKey]).map(function(e) {
                        return aResData[sKey][e];
                    });

                    var sSelectedAttribute = '';
                    if (isExistObj(sHiddenData) && sVal[0] === sHiddenData) {
                        sSelectedAttribute = 'selected';
                    }
                    sOptionMarkup = "<option value='" + sVal +"' " + sSelectedAttribute +">" + sVal + "</option>";

                    sSelector.append(sOptionMarkup);
                }
            }
        });
    };

    /**
     * 수정 페이지에서 Input 항목에 값을 할당합니다.
     */
    var setInputAddr = function(sPageType)
    {
        var aAddrFieldSelectors = aAddrInfo[sPageType].aAddrFieldSelector;
        var sBaseAddrSelector = aAddrFieldSelectors['baseAddr'];
        var sDetailAddrSelector = aAddrFieldSelectors['detailAddr'];
        var sStateSelector = aAddrFieldSelectors['state']['DEFAULT'];
        var sCitySelector = aAddrFieldSelectors['city']['DEFAULT'];
        var sZipcodeSelector = aAddrFieldSelectors['zipcode'];

        EC$('#' + sBaseAddrSelector).val(EC$('#__' + sPageType + '_baseAddr').val());
        EC$('#' + sDetailAddrSelector).val(EC$('#__' + sPageType + '_detailAddr').val());
        EC$('#' + sStateSelector).val(EC$('#__' + sPageType + '_state').val());
        EC$('#' + sCitySelector).val(EC$('#__' + sPageType + '_city').val());
        EC$('#' + sZipcodeSelector).val(EC$('#__' + sPageType + '_zipcode').val());
    };

    /**
     * 수정 페이지에서 State 항목을 selected
     * 미국, 캐나다의 경우 Area가 존재하지 않고, State 리스트만 제공함
     */
    var setStateSelected = function(sCountryCode, sPageType, sStateHiddenData)
    {
        var sStateSelectorName = '';
        if (sCountryCode === 'CA') {
            sStateSelectorName = 'CA';
        } else if (sCountryCode === 'US') {
            sStateSelectorName = 'US';
        }

        var aStateList = common_aAddrInfo.aAllStateList[sStateSelectorName];
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var sStateSelector = EC$('#' + aAddrFieldSelector['state'][sStateSelectorName]);

        // selected 셋팅
        sStateSelector.empty();
        sStateSelector.append('<option value="">' + __('SELECT.STATE.'+sCountryCode, sGroupId) + '</option>'); // unselected 문구
        for (var sKey in aStateList) {
            var sVal = Object.keys(aStateList[sKey]).map(function(e) {
                return aStateList[sKey][e];
            });

            var sSelectedAttribute = '';
            if (isExistObj(aStateList) && sVal[0] === sStateHiddenData) {
                sSelectedAttribute = 'selected';
            }
            sOptionMarkup = "<option value='" + sVal +"' " + sSelectedAttribute +">" + sVal + "</option>";
            sStateSelector.append(sOptionMarkup);
        }
    };

    /**
     * 수정 페이지에서 Select 주소 검색을 하는 항목을 selected
     * hidden 값을 기준으로 데이터를 셋팅
     *
     * @param sCountryCode
     * @param sPageType
     * @param aAreaHiddenData
     */
    var setAreaAddrSelected = function(sCountryCode, sPageType, aAreaHiddenData)
    {
        var aIsAreaAddr = EC_ADDR_COMMONFORMAT_FRONT.getConfigIsAreaAddr(sPageType);
        if (aIsAreaAddr['sIsAreaAddr'] !== 'T') {
            return;
        }

        if (aIsAreaAddr['sIsTwoSelectInArea'] === 'T') { /* state, street 주소 검색 셀렉트박스가 있는 국가 */
            if (!isExistObj(aAreaHiddenData['sStreetName'])) {
                aAreaHiddenData['sStreetName'] = aAreaHiddenData['sCityName'];
            }
            aAreaHiddenData['sCityName'] = '';
        }

        var aAddressSelectCallParams = {
            sLanguage: aCountryDomainToShopLanguage[sCountryCode],
            si_name: '',
            ci_name: '',
            gu_name: ''
        };

        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var sHiddenData = '';
        var sSelector = '';
        var sCurrentField = '';
        for( var sKey in aAreaHiddenData) {
            if (sKey === 'sStateName') {
                sHiddenData = aAreaHiddenData['sStateName'];
                sSelector = EC$('#' + aAddrFieldSelector['state']['AREA']);
                sCurrentField = 'state';

            } else if (sKey === 'sCityName') {
                aAddressSelectCallParams['si_name'] = aAreaHiddenData['sStateName'];
                sHiddenData = aAreaHiddenData['sCityName'];
                sSelector = EC$('#' + aAddrFieldSelector['city']['AREA']);
                sCurrentField = 'city';

            } else if (sKey === 'sStreetName') {
                aAddressSelectCallParams['ci_name'] = aAreaHiddenData['sCityName'];
                sHiddenData = aAreaHiddenData['sStreetName'];
                sSelector = EC$('#' + aAddrFieldSelector['street']['AREA']);
                sCurrentField = 'street';
            }

            setUpAddrSelected(aAddressSelectCallParams, sSelector, sHiddenData, sCountryCode, sCurrentField);
        }
    };

    /**
     * 셀렉트박스로 주소를 검색하는 국가들에 대해서
     * 1) __ 로 시작하는 인풋 히든 값을 동적으로 셋팅
     * 2) UI 상에 직접 노출되지 않는 기본주소 엘리먼트에 full address를 셋팅
     * @param sCountryCode
     * @param sPageType
     * @param aHiddenBundleData
     */
    var setAddrHiddenBundle = function (sCountryCode, sPageType, aHiddenBundleData)
    {
        var aIsAreaAddr = EC_ADDR_COMMONFORMAT_FRONT.getConfigIsAreaAddr(sPageType);
        if (aIsAreaAddr['sIsAreaAddr'] === 'F') return;

        var aOrderPageType = ['orderer', 'freceiver'];
        var aMemberPageType = ['join', 'modify'];
        var aReceiverUpdatePageType = ['freceiverUpdate'];
        var aAddrFieldSelector = aAddrInfo[sPageType]['aAddrFieldSelector'];

        var sStateName = '';
        var sCityName = '';
        var sStreetName = '';
        if (aHiddenBundleData === undefined) {
            sStateName = EC$('#' + aAddrFieldSelector['state']['AREA']).val();
            sCityName = EC$('#' + aAddrFieldSelector['city']['AREA']).val();
            sStreetName = EC$('#' + aAddrFieldSelector['street']['AREA']).val();
        } else {
            sStateName = aHiddenBundleData['sStateName'];
            sCityName = aHiddenBundleData['sCityName'];
            sStreetName = aHiddenBundleData['sStreetName'];
        }

        var sStateInputSelector = aAddrFieldSelector['state']['DEFAULT'];
        var sCityInputSelector = aAddrFieldSelector['city']['DEFAULT'];
        var sBaseAddrSelector = aAddrFieldSelector['baseAddr'];

        if (aIsAreaAddr['sIsThreeSelectInArea'] === 'T') { /* state, city, street 주소 검색 셀렉트박스가 모두 있는 국가 */
            if (sStateName == '' || sCityName == '' || sStreetName == '') {
                EC$('#__state_name').val('');
                EC$('#__city_name').val('');
                EC$('#__addr1').val('');
                EC$('#__address_addr1').val('');
                EC$('#' + sBaseAddrSelector).val('');

                /* 주문서 추가 처리 */
                if (aOrderPageType.indexOf(sPageType) > -1) {
                    var aHiddenAddrInfo = new Array();
                    aHiddenAddrInfo['sAddrId'] = ''; // __addr1
                    aHiddenAddrInfo['sCityId']  = ''; // __city_name
                    aHiddenAddrInfo['sStateId']  = ''; //__state_name

                    if (typeof (EC_SHOP_FRONT_ORDERFORM_SHIPPING) != 'undefined') {
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.proc.setForeignAddress(aHiddenAddrInfo);
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.exec();
                    }
                }
                return;
            } else {
                EC$('#__state_name').val(sStateName);
                EC$('#__city_name').val(sCityName);
                EC$('#__addr1').val(sStreetName);
                EC$('#__address_addr1').val(sStreetName);

                var sDisplayText = makeAddrTextForArea(sCountryCode, sStateName, sCityName, sStreetName);
                EC$('#' + sBaseAddrSelector).prop('disabled', false);
                EC$('#' + sBaseAddrSelector).val(sDisplayText);

                /* 주문서 추가 처리 */
                if (aOrderPageType.indexOf(sPageType) > -1) {
                    EC$('#' + sStateInputSelector).prop('disabled', false);
                    EC$('#' + sCityInputSelector).prop('disabled', false);
                    EC$('#' + sStateInputSelector).val(sStateName);
                    EC$('#' + sCityInputSelector).val(sCityName);

                    var aHiddenAddrInfo = new Array();
                    aHiddenAddrInfo['sAddrId'] = sStreetName; // __addr1
                    aHiddenAddrInfo['sCityId']  = sCityName; // __city_name
                    aHiddenAddrInfo['sStateId']  = sStateName; //__state_name
                    if (typeof (EC_SHOP_FRONT_ORDERFORM_SHIPPING) != 'undefined') {
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.proc.setForeignAddress(aHiddenAddrInfo);
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.exec();
                    }
                }
            }
        } else if (aIsAreaAddr['sIsTwoSelectInArea'] === 'T') { /* state, street 주소 검색 셀렉트박스가 있는 국가 */
            if ( sStateName == '' || sStreetName == '') {
                EC$('#__state_name').val('');
                EC$('#__city_name').val('');
                EC$('#__addr1').val('');
                EC$('#' + sBaseAddrSelector).val('');

                /* 주문서 추가 처리 */
                if (aOrderPageType.indexOf(sPageType) > -1) {
                    var aHiddenAddrInfo = new Array();
                    aHiddenAddrInfo['sAddrId'] = ''; // __addr1
                    aHiddenAddrInfo['sCityId']  = ''; // __city_name
                    aHiddenAddrInfo['sStateId']  = ''; //__state_name
                    if (typeof (EC_SHOP_FRONT_ORDERFORM_SHIPPING) != 'undefined') {
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.proc.setForeignAddress(aHiddenAddrInfo);
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.exec();
                    }
                }
                return;
            } else {
                EC$('#__state_name').val(sStateName);
                EC$('#__city_name').val(sStreetName);
                EC$('#' + sBaseAddrSelector).prop('disabled', false);
                EC$('#' + sBaseAddrSelector).val(sStateName + ' ' + sStreetName);

                /* 주문서 추가 처리 */
                if (aOrderPageType.indexOf(sPageType) > -1) {
                    EC$('#__state_name').val('');
                    EC$('#__city_name').val('');
                    EC$('#' + sStateInputSelector).val('');
                    EC$('#' + sCityInputSelector).val('');

                    var aHiddenAddrInfo = new Array();
                    aHiddenAddrInfo['sAddrId'] = sStateName + ' ' + sStreetName; // __addr1
                    aHiddenAddrInfo['sStateId']  = ''; // __state_name
                    aHiddenAddrInfo['sCityId']  = ''; // __city_name
                    if (typeof (EC_SHOP_FRONT_ORDERFORM_SHIPPING) != 'undefined') {
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.proc.setForeignAddress(aHiddenAddrInfo);
                        EC_SHOP_FRONT_ORDERFORM_SHIPPING.exec();
                    }
                }

                /* 배송지 변경 추가 처리 */
                if (aReceiverUpdatePageType.indexOf(sPageType) > -1) {
                    EC$('#__addr1').val(EC$('#__state_name').val() + ' ' + EC$('#__city_name').val());
                }
            }
        }

        /* 상세주소 입력란으로 포커스 이동 */
        if (EC$('#' + aAddrFieldSelector['detailAddr']).length > 0) EC$('#' + aAddrFieldSelector['detailAddr']).focus();

        /* 지역별배송비 부과를 위해 event발생 */
        if (aMemberPageType.indexOf(sPageType) > -1) EC$('#' + aAddrFieldSelector['zipcode'] + ', #' + sBaseAddrSelector).blur();
    };

    /**
     * 전체 주소를 한 줄 텍스트로 생성
     * ex)
     *   1) 베트남/필리핀 : Detail + Street + City + State
     *   2) 중국 : State + City + Street + Detail
     *   3) 미국/캐나다 : Base + Detail + City + State
     */
    var makeFullAddrText = function(sPageType, sCountryCode)
    {
        var sDisplayText = '';

        /* 관리하는 국가가 아니면 DEFAULT */
        if (aManagedCountryList.indexOf(sCountryCode) === -1) {
            sCountryCode = 'DEFAULT';
        }
        var aDisplayTextList = common_aAddrInfo.aAllCountryFormat[sCountryCode].display_text;

        // 한줄 스펙이 없다면 빈 문자열 반환
        if (isExistObj(aDisplayTextList) === false) {
            return sDisplayText;
        }

        var aAddrFieldSelectors = aAddrInfo[sPageType]['aAddrFieldSelector'];
        var aIsAreaAddr = getConfigIsAreaAddr(sPageType);

        // default 셀렉터
        var sBaseAddrSelector = aAddrFieldSelectors['baseAddr'];
        var sDetailAddrSelector = aAddrFieldSelectors['detailAddr'];
        var sStateSelector = aAddrFieldSelectors['state']['DEFAULT'];
        var sCitySelector = aAddrFieldSelectors['city']['DEFAULT'];
        var sStreetSelector = aAddrFieldSelectors['street']['DEFAULT'];

        // State, City, Street 셀렉터 정의
        if (aIsAreaAddr.sIsAreaAddr === 'T') {
            if (aIsAreaAddr.sIsThreeSelectInArea === 'T') {
                sStateSelector = aAddrFieldSelectors['state']['AREA'];
                sCitySelector = aAddrFieldSelectors['city']['AREA'];
                sStreetSelector = aAddrFieldSelectors['street']['AREA'];

            } else if (aIsAreaAddr.sIsTwoSelectInArea === 'T') {
                sStateSelector = aAddrFieldSelectors['state']['AREA'];
                sStreetSelector = aAddrFieldSelectors['street']['AREA'];
            }

        }

        // State만 존재하는 경우
        if (aIsAreaAddr.sIsAreaAddr === 'F'
            && common_aAddrInfo.aAllCountryFormat[sCountryCode].select !== undefined
            && common_aAddrInfo.aAllCountryFormat[sCountryCode].select.indexOf('state') > 0)
        {
            sStateSelector = aAddrFieldSelectors['state'][sCountryCode];

        }

        // Full Address 생성
        for (var i = 0; i < aDisplayTextList.length; i++) {
            if (aDisplayTextList[i] === 'baseAddr') {
                sDisplayText += EC$("#" + sBaseAddrSelector).val() + ' ';
            } else if (aDisplayTextList[i] === 'detailAddr') {
                sDisplayText += EC$("#" + sDetailAddrSelector).val() + ' ';
            } else if (aDisplayTextList[i] === 'state') {
                sDisplayText += EC$("#" + sStateSelector).val() + ' ';
            } else if (aDisplayTextList[i] === 'city') {
                sDisplayText += EC$("#" + sCitySelector).val() + ' ';
            } else if (aDisplayTextList[i] === 'street') {
                sDisplayText += EC$("#" + sStreetSelector).val() + ' ';
            }
        }

        return sDisplayText.trim();
    };

    /**
     * Area 영역의 문구를 한 줄 텍스트로 생성
     * ex)
     *   1) 중국 : State + City + Street
     *   2) 베트남 : Street + City + State
     *
     * @param sCountryCode
     * @param sStateName
     * @param sCityName
     * @param sStreetName
     */
    var makeAddrTextForArea = function(sCountryCode, sStateName, sCityName, sStreetName)
    {
        var sDisplayText = '';

        var aDisplayTextList = common_aAddrInfo.aAllCountryFormat[sCountryCode].display_text;
        if (isExistObj(aDisplayTextList) === false) {
            return sDisplayText;
        }

        for (var i = 0; i < aDisplayTextList.length; i++) {
            if (aDisplayTextList[i] === 'state') {
                sDisplayText += sStateName + ' ';
            } else if (aDisplayTextList[i] === 'city') {
                sDisplayText += sCityName + ' ';
            } else if (aDisplayTextList[i] === 'street') {
                sDisplayText += sStreetName + ' ';
            }
        }

        return sDisplayText.trim();
    };

    /**
     * State, City, Street의 selectbox 데이터 셋팅
     * @param sCountry
     * @param sArea
     * @param sSelector
     * @param aSelectData
     */
    var setSelectList = function(sCountry, sArea, sSelector, aSelectData)
    {
        /* 관리하는 국가가 아니면 DEFAULT 문구 */
        if (aManagedCountryList.indexOf(sCountry) === -1) {
            sCountry = 'DEFAULT';
        }

        if (sSelector.length > 0) {
            sSelector.empty();
            sSelector.attr('fw-label', __(sArea.toUpperCase() + '.' + sCountry, sGroupId));
            sSelector.append('<option value="">' + __('SELECT.'+sArea.toUpperCase()+'.'+sCountry, sGroupId) + '</option>');

            if (isExistObj(aSelectData) === false) {
                return;
            }
            for (var sKey in aSelectData) {
                var sVal = Object.keys(aSelectData[sKey]).map(function(e) {
                    return aSelectData[sKey][e];
                });

                if (isExistObj(sVal[0]) === false) {
                    continue;
                }
                sSelector.append( "<option value='" + sVal +"'>" + sVal + "</option>" );
            }
        }
    };

    /**
     * country_code(KRW) -> country_domain(KR) 로 변환
     *
     * @param sCountryCode 국가코드(3자리)
     * @return 국가도메인(2자리)
     */
    var convertCountryDomainToCode = function(sCountryCode)
    {
        return common_aAddrInfo.aCountryList[sCountryCode].country_code;
    };

    /**
     * country_code(KRW) -> country_name(대한민국(KOREA (REP OF,))) 로 변환
     *
     * @param sCountryCode 국가코드(3자리)
     * @return 국가명
     */
    var convertCountryDomainToName = function(sCountryCode)
    {
        return common_aAddrInfo.aCountryList[sCountryCode].country_name;
    };

    return {
        init: init,
        aAddrInfo: aAddrInfo,
        setRuleBaseForm: setRuleBaseForm,
        getCountryRule: getCountryRule,
        getDisplayFieldsAndOrdering: getDisplayFieldsAndOrdering,
        setInputAddr: setInputAddr,
        removeFilter: removeFilter,
        setAddrFieldName: setAddrFieldName,
        setStateSelected: setStateSelected,
        setAreaAddrSelected: setAreaAddrSelected,
        unblockedZipcodeField: unblockedZipcodeField,
        setConfigIsAreaAddr: setConfigIsAreaAddr,
        getConfigIsAreaAddr: getConfigIsAreaAddr,
        setAddrHiddenBundle: setAddrHiddenBundle,
        makeFullAddrText: makeFullAddrText,
        convertCountryDomainToCode: convertCountryDomainToCode,
        convertCountryDomainToName: convertCountryDomainToName
    };
})();


EC$(function() {
    EC_ADDR_COMMONFORMAT_FRONT.init();

    // 주문 JS load 순서로 인하여, trigger 처리
    EC$(document).trigger('EC_ADDR_COMMONFORMAT_LOAD');
});

var memberVerifyMobile = {};

/**
 * 회원 가입시 인증 번호 전송에 필요한 정보 암호화
 */
memberVerifyMobile.joinSendVerificationNumber = function()
{
    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': ['joinForm::mobile1', 'joinForm::mobile2', 'joinForm::mobile3'],
        'auth_callbackName': 'memberVerifyMobile.sendVerificationNumberEncryptResult'
    });
};

/**
 * 회원 정보 수정시 인증 번호 전송에 필요한 정보 암호화
 */
memberVerifyMobile.editSendVerificationNumber = function()
{
    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': ['editForm::mobile1', 'editForm::mobile2', 'editForm::mobile3'],
        'auth_callbackName': 'memberVerifyMobile.sendVerificationNumberEncryptResult'
    });
};

memberVerifyMobile.sendVerificationNumberEncryptResult = function(output)
{
    var sEncrypted = encodeURIComponent(output);

    if (AuthSSLManager.isError(sEncrypted) == true) {
        return;
    }

    EC$.ajax({
        url: '/exec/front/member/ApiAuthsms',
        cache: false,
        type: 'POST',
        dataType: 'json',
        data: '&encrypted_str=' + sEncrypted,
        success: function(response) {
            try {
                response.sResultMsg = decodeURIComponent(response.sResultMsg);
            } catch (e) {}

            if (response.sResultCode == '0000') {
                memberVerifyMobile.sendVerificationNumberSuccess(response);
            } else {
                memberVerifyMobile.sendVerificationNumberFail(response);
            }
        }
    });
};

/**
 * 회원 가입 휴대전화 인증 번호 전송 성공
 */
memberVerifyMobile.sendVerificationNumberSuccess = function(response)
{
    // sms 실제 발송 여부 확인
    if (response.isSendMobileSms !== true) {
        return;
    }

    if (EC$("#btn_action_verify_mobile").html() == __('GET.VERIFICATION.NUMBER', 'MEMBER.UTIL.VERIFY')) {
        alert(__('NUMBER.RESENT', 'MEMBER.UTIL.VERIFY'));
    }

    this.verifyNumberCountdown();

    EC$("#btn_action_verify_mobile").html(__('RETRANSMISSION', 'MEMBER.UTIL.VERIFY'));
    EC$("#confirm_verify_mobile").removeClass("displaynone");
    EC$("#confirm_verify_mobile").show();

    var oVerifySmsNumber = EC$("#verify_sms_number");

    oVerifySmsNumber.attr("placeholder", "");

    if (EC_MOBILE === true) {
        alert(response.sResultMsg);
        return;
    }

    EC$("#result_send_verify_mobile_fail").hide();
    EC$("#result_send_verify_mobile_success").removeClass("displaynone");
    EC$("#result_send_verify_mobile_success").show();
    EC$("#btn_verify_mobile_confirm").prop("disabled", false);
    oVerifySmsNumber.prop('disabled', false);
};

/**
 * 회원 가입 휴대전화 인증 번호 전송 실패
 */
memberVerifyMobile.sendVerificationNumberFail = function(response)
{
    EC$("#btn_action_verify_mobile").html(__('GET.VERIFICATION.NUMBER', 'MEMBER.UTIL.VERIFY'));

    if (EC_MOBILE === true) {
        alert(response.sResultMsg);
        return;
    }

    EC$("#result_send_verify_mobile_success").hide();

    var oResultSendVerifyMobileFail = EC$("#result_send_verify_mobile_fail");
    oResultSendVerifyMobileFail.removeClass("displaynone");
    oResultSendVerifyMobileFail.show();
    oResultSendVerifyMobileFail.html(response.sResultMsg.replace(/\n/g, "<br />"));

    EC$("#expiryTime").html("");
    clearInterval(memberVerifyMobile.timer);

    var oVerifySmsNumber = EC$("#verify_sms_number");
    if (response.sResultCode == "3001") {
        EC$("#confirm_verify_mobile").removeClass("displaynone");
        EC$("#confirm_verify_mobile").show();
        oVerifySmsNumber.val("");
        oVerifySmsNumber.attr("placeholder", __('TRY.AGAIN.IN.MINUTES', 'MEMBER.UTIL.VERIFY'));
        oVerifySmsNumber.prop("disabled", true);
        EC$("#btn_verify_mobile_confirm").prop("disabled", true);
        return;
    } else {
        oVerifySmsNumber.removeAttr("placeholder");
        EC$("#expiryTime").prop("disabled", false);
    }

    EC$("#confirm_verify_mobile").hide();
};

/**
 * 휴대폰 인증 번호 카운트 다운
 */
memberVerifyMobile.verifyNumberCountdown = function()
{
    //초기값
    var iMinute = 3;
    var iSecond = "00";
    var iZero = "";
    var iTmpSecond = "";

    // 초기화
    if (typeof memberVerifyMobile.timer != "undefined") {
        clearInterval(memberVerifyMobile.timer);
    }

    EC$("#expiryTime").html(iMinute +":"+iSecond);

    // 초기화
    memberVerifyMobile.timer = setInterval(function () {
        iSecond = iSecond.toString();

        if (iSecond.length < 2) {
            iTmpSecond = iSecond;
            iZero = 0;
            iSecond = iZero + iTmpSecond;
        }

        // 설정
        EC$("#expiryTime").html(iMinute +":"+iSecond);
        if (iSecond == 0 && iMinute == 0) {
            clearInterval(memberVerifyMobile.timer); /* 타이머 종료 */
            EC$("#confirm_verify_mobile").hide();
            EC$("#result_send_verify_mobile_success").hide();
        } else {
            iSecond--;
            // 분처리
            if(iSecond < 0){
                iMinute--;
                iSecond = 59;
            }
        }
    }, 1000); /* millisecond 단위의 인터벌 */
};


/**
 * 회원 가입시 인증 번호 전송에 필요한 정보 암호화
 */
memberVerifyMobile.joinVerifySmsNumberConfirm = function()
{
    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': ['joinForm::mobile1', 'joinForm::mobile2', 'joinForm::mobile3', 'joinForm::verify_sms_number'],
        'auth_callbackName': 'memberVerifyMobile.joinVerifySmsNumberConfirmResult'
    });
};

/**
 * 회원 가입시 인증 번호 전송에 필요한 정보 암호화
 */
memberVerifyMobile.editVerifySmsNumberConfirm = function()
{
    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': ['editForm::mobile1', 'editForm::mobile2', 'editForm::mobile3', 'editForm::verify_sms_number'],
        'auth_callbackName': 'memberVerifyMobile.joinVerifySmsNumberConfirmResult'
    });
};

/**
 * 인증번호 확인
 * @param output
 */
memberVerifyMobile.joinVerifySmsNumberConfirmResult = function(output)
{
    var sEncrypted = encodeURIComponent(output);

    if (AuthSSLManager.isError(sEncrypted) == true) {
        return;
    }

    EC$.ajax({
        url: '/exec/front/member/ApiAuthJoinconfirm',
        cache: false,
        type: 'POST',
        dataType: 'json',
        data: '&encrypted_str=' + sEncrypted,
        success: function(response) {
            try {
                response['sResultMsg'] = decodeURIComponent(response['sResultMsg']);
            } catch (err) {}

            if (response.sResultCode == '0000') {
                memberVerifyMobile.joinVerifySmsNumberConfirmSuccess(response);
            } else {
                memberVerifyMobile.joinVerifySmsNumberConfirmFail(response);
            }
        }
    });
};

/**
 * 회원 가입 휴대전화 인증 성공
 */
memberVerifyMobile.joinVerifySmsNumberConfirmSuccess = function(response)
{
    EC$("#verify_sms_number").val("");
    EC$("#verify_sms_number").attr("placeholder", response['sResultMsg']);
    EC$("#verify_sms_number").prop('disabled', true);

    EC$("#expiryTime").hide();
    EC$("#isMobileVerify").val("T");
};

/**
 * 회원 가입 휴대전화 인증 실패
 */
memberVerifyMobile.joinVerifySmsNumberConfirmFail = function(response)
{
    alert(response['sResultMsg']);
    EC$("#isMobileVerify").val("F");
};

memberVerifyMobile.requireMobileNumber = function(oMobileElement)
{
    if (oMobileElement.val() != "") {
        return;
    }

    var oResultSendVerifyMobileFail = EC$("#result_send_verify_mobile_fail");
    oResultSendVerifyMobileFail.removeClass("displaynone");
    oResultSendVerifyMobileFail.show();
    oResultSendVerifyMobileFail.html(__('ENTER.YOUR.MOBILE.NUMBER', 'MEMBER.UTIL.VERIFY'));
};

/**
 * 휴대전화 인증 여부
 * @returns {boolean}
 */
memberVerifyMobile.isMobileVerify = function()
{
    if (EC$("#use_checking_mobile_number_duplication").val() != "T") {
        return true;
    }

    if (EC$("#isMobileVerify").val() == "F") {
        return false;
    }

    return true;
};

/**
 * 휴대전화 변경 전 기존 정보 확인
 */
memberVerifyMobile.setEditMobileNumberBefore = function(aMember)
{
    if (aMember.hasOwnProperty('mobile1')) {
        memberVerifyMobile.editMobile1 = aMember['mobile1'];
    }

    if (aMember.hasOwnProperty('mobile2')) {
        memberVerifyMobile.editMobile2 = aMember['mobile2'];
    }

    if (aMember.hasOwnProperty('mobile3')) {
        memberVerifyMobile.editMobile3 = aMember['mobile3'];
    }
};

/**
 * 휴대전화 번호 변경 됐는지 확인
 */
memberVerifyMobile.isMobileNumberChange = function()
{
    if (EC$("#use_checking_mobile_number_duplication").val() != "T") {
        return false;
    }

    if (EC$("#mobile1").val() != memberVerifyMobile.editMobile1) {
        return true;
    }

    if (EC$("#mobile2").val() != memberVerifyMobile.editMobile2) {
        return true;
    }

    if (EC$("#mobile3").val() != memberVerifyMobile.editMobile3) {
        return true;
    }

    return false;
};

EC$(function() {
    EC$("#mobile2").on('blur', function(){
        memberVerifyMobile.requireMobileNumber(EC$(this));
    });

    EC$("#mobile3").on('blur', function(){
        memberVerifyMobile.requireMobileNumber(EC$(this));
    });
});
/**
 * 인증 display
 */

EC$(function(){

    //인증 display
    var displayAuth = new DisplayAuth();
    displayAuth.display();

    EC$('input[name=member_type], input[name=personal_type], input[name=company_type], input[name=foreigner_type]').on('click', function(){
        displayAuth.display();
    });


});



var DisplayAuth = function()
{

    this.isNameAuthUse = EC$('#is_name_auth_use').val();
    this.isIpinAuthUse = EC$('#is_ipin_auth_use').val();
    this.isEmailAuthUse = EC$('#is_email_auth_use').val();



    /**
     * 인증 display toggle
     */
    this.display = function()
    {
        // 해외몰의 경우 없어서 그냥 return;
        var $oMemberType = EC$('input[name=member_type]:checked');
        if ($oMemberType.length < 1) return false;
        
        //회원구분
        var checkMemberType = EC$('input[name=member_type]:checked').val();
        var memberTypeMap = {'p' :'Person', 'c' : 'Company', 'f' : 'Foreigner'};
        var memberType = memberTypeMap[checkMemberType];

        this.init();

        //사업자 구분은 tr 이 다르기 때문에 따로
        this.displayCompany(memberType);


        this['type' + memberType]();//레이어 toggle (회원 구분에 의한 상세 controll)



    };

    /**
     * 일단 모두 끄고 인증 영역만 show
     */
    this.init = function()
    {
        //인증영역
        EC$('#authWrap div').hide();//모두 off
        EC$('#companyWrap').hide();//사업자구분 off

        //사업자가 보여지지 않아야 하는 경우 감춤
        if (displayMemberType.business != 'T') {
            EC$('#member_type1').hide();
            EC$('label[for=member_type1]').hide();
        }

        //실명인증 안쓰면 인증wrap 비워버림
        if (EC$('#member_name_cert_flag').val() == 'F') {
            EC$('#realNameAuth').html('');
            EC$('#ipinWrap').html('');
            EC$('#mobileWrap').html('');
            EC$('#emailWrap').html('');
            EC$('#authMember').hide();//회원인증 tr
        } else {
            EC$('#authWrap').show();//회원인증 wrap
        }

        //기본정보 영역
        EC$('#nation').hide();

        //상호명 숨김
        EC$('#companyRow').hide();

        //사업자 번호 숨김
        EC$('#companyNoRow').hide();

        if ( typeof bFlagRealNameEncrypt == 'undefined') {
            EC$('#realNameEncrypt').val('');
        }
    };

    /**
     * 사업자 구분 보여주는 method
     */
    this.displayCompany = function(memberType)
    {
        if (memberType == 'Company') EC$('#companyWrap').show();//법인사업자 인증
        else  EC$('#companyWrap').hide();

    };



    /**
     * 개인 회원 인증 영역
     */
    this.typePerson = function()
    {
        EC$('#personAuth').show();
        EC$('#personalTypeWrap').show();
        
        // 모바일 웹
        // ECHOSTING-16798 신규 도입 - 휴대폰 인증 처리로 오픈으로 기존 로직 주석처리
        //if ( EC$('input[name=personal_type]').length < 1 ) {
        //    
        //    EC$('#auth_tr').hide(); EC$('#ipin_tr').hide();
        //    
        //    if (EC$('input[name=personal_type]:checked').val() == 'n' && EC$('#member_name_cert_flag').val() == 'T') {
        //        EC$('#auth_tr').show();
        //        EC$('#rname_tr').show();
        //        EC$('#rssn_tr').show();
        //       EC$('#ipin_tr').hide();
        //    } else if (EC$('input[name=personal_type]:checked').val() == 'i') {
        //        EC$('#auth_tr').show();
        //        EC$('#rname_tr').hide();
        //        EC$('#rssn_tr').hide();
        //        EC$('#ipin_tr').show();
        //    }
        // }

        EC$('#nameContents').html('');
        // ECHOSTING-89438 개인 또는 사업자에 따라 이메일 인증 제공 설정
        if (EC$('#is_email_auth_use').val() == 'T') {
            try {
                // 사업자 + 개인사업자
                if (EC$('input[name=member_type]:checked').val() == 'c' && EC$('input[name=company_type]:checked').val() == 'p') {
                    // 이메일 인증 체크시 체크 해제 후 첫번째 인증 수단 체크
                    if (EC$('input[name=personal_type]:checked').val() == 'e') {
                        EC$('input[name=personal_type]').eq(0).prop('checked',true);
                    }
                    // 인증수단이 이메일 인증인 경우(개인사업자 이메일인증 제공안함)
                    if (mobileWeb) {
                        EC$("input[name='personal_type'][value='e']").prop('checked',false).attr('fw-filter','').parent().hide();
                    } else {
                        EC$("input[name='personal_type'][value='e']").prop('checked',false).attr('fw-filter','').hide().next().hide();
                    }
                }
                // 개인회원
                if (EC$('input[name=member_type]:checked').val() == 'p') {
                        EC$("input[name='personal_type'][value='e']").attr('fw-filter','isFill').parent().show();
                    if (mobileWeb) {
                    } else {
                        EC$("input[name='personal_type'][value='e']").attr('fw-filter','isFill').show().next().show();
                    }
                }
            } catch (e) {}
        }

        // 실명인증
        if (EC$('input[name=personal_type]:checked').val() == 'n' && EC$('#member_name_cert_flag').val() == 'T') {
            EC$('#realNameAuth').show();
            this.changeText(userOption['personalName'], userOption['personalSsn']);
        }
        // 아이핀 인증 
        else if (EC$('input[name=personal_type]:checked').val() == 'i') {
            EC$('#ipinWrap').show();
            this.changeText(userOption['personalName'], '');
        }
        // 휴대폰 인증 
        else if (EC$('input[name=personal_type]:checked').val() == 'm') {
            EC$('#mobileWrap').show();
            this.changeText(userOption['personalName'], '');
        }
        // 이메일 인증 
        else if (EC$('input[name=personal_type]:checked').val() == 'e') {
            EC$("input[name='personal_type'][value='e']").prop("checked", true);
            EC$('#emailWrap').show();
            this.changeText(userOption['personalName'], '');
            EC$('#nameContents').html('<input type="text" name="name" id="name" maxlength="20">');
            EC$('#realNameEncrypt').val('EMAIL_AUTH');
        }
        else {
            EC$('#realNameAuth').show();

            if (EC$('#is_display_register_ssn').val() != 'T')  {//주민번호 사용 안하면
                var sSsnText = '';
            } else{
                var sSsnText = userOption['personalSsn'];

                var sSsnContentsHtml = '<input name="ssn1" id="ssn1" type="text" maxLength="6"';

                // 14세 미만 가입 제한 및 인증 필요 시
                if (EC$('#is_under14_joinable').val() != 'T') {
                    sSsnContentsHtml += 'onchange="checkIsUnder14({ ssn1 : this.value })"';
                }

                sSsnContentsHtml += '> - ';
                sSsnContentsHtml += '<input name="ssn2" id="ssn2" type="password" maxLength="7"/>';

                EC$('#ssnContents').html(sSsnContentsHtml);
            }

            EC$('#nameContents').html('<input type="text" name="name" id="name" maxlength="20">');
            this.changeText(userOption['personalName'], sSsnText);
            EC$('#identification_check_nonauth').show();
        }
      

    };


    /**
     * 사업자 회원 인증 영역
     */
    this.typeCompany = function()
    {

        if (EC$('input[name=company_type]:checked').val() == 'p') {//개인 사업자
            //개인 인증
            EC$('#personAuth').show();
            EC$('#personalTypeWrap').show();          

            //인증방법
            if (EC$('input[name=personal_type]:checked').val() == 'n') EC$('#realNameAuth').show();
            else if (EC$('input[name=personal_type]:checked').val() == 'i') EC$('#ipinWrap').show();
            else if (EC$('input[name=personal_type]:checked').val() == 'm') EC$('#mobileWrap').show();
            else {
                EC$('#companyRow').show();
                EC$('#nameContents').html('<input type="text" name="name" id="name">');
            }

            this.changeText(userOption['personalName'], '');
            EC$('#joinForm #name').show();
            EC$('#cname').show();//상호명 input
            EC$('#companyNoRow').show();//사업자 번호

            EC$('#companyRow').show(); // 상호명 tr show
            EC$('#companyName').html('<input name="cname" class="inputTypeText" id="cname" type="text" maxLength="20" fw-msg="" fw-label="상호명" fw-filter="isMax[20]" value=""/>');

            this['typePerson']();
        } else {//법인
            EC$('#businessAuth').show();
            EC$('#authMember').show();
            EC$('#authWrap').show();
            EC$('#businessAuth').show();
            EC$('#joinForm #name').hide();

            EC$('#ssnContents').html('');//법인번호
            EC$('#companyRow').show();//상호명 tr
            EC$('#cname').hide();//상호명 input
            EC$('#companyNoRow').show();//사업자번호


            this.changeText(userOption['companyName'], userOption['companySsn']);
        }


    };


    /**
     * 외국인
     */
    this.typeForeigner = function()
    {
        EC$('#authMember').show();//인증 tr
        EC$('#authWrap').show();//회원인증 wrap
        EC$('#foreignerAuth').show();
        EC$('#nameContents').html('');
        EC$('#ssnContents').html('');
        //EC$('#member_type1').hide();

        var sForeignerType = EC$('input[name=foreigner_type]:checked').val();
        var sTypeMap = {'f' : userOption['foreignerSsn1'], 'p' : userOption['foreignerSsn2'], 'd' : userOption['foreignerSsn3']};
        var sTitle = sTypeMap[sForeignerType];
        if (sForeignerType == 'e') {
            EC$('#foreignerEmailWrap').show();
            EC$('#foreigner_ssn').val('').hide().next().hide();
            EC$('#realNameEncrypt').val('EMAIL_AUTH');
            // 기본정보 영역
            EC$('#ssnTitle').parent().hide();
            EC$('#nameContents').html(EC$('#foreigner_name').val());
        } else {
            EC$('#foreignerPersonWrap').show();
            EC$('#foreigner_ssn').val('').show().next().show();
            // 기본정보 영역
            EC$('#ssnTitle').parent().show();
            this.changeText(userOption['personalName'], sTitle);
        }
        EC$('#nameTitle').parent().show();
        EC$('#nation').show();
    };





    /**
     * 기본 정보 영역에 있는 부분 text 바꿔주기
     * @param sName 이름 title 영역에 들어갈 text
     * @param sSsn 주민번호 title 영역에 들어갈 text
     */
    this.changeText = function(sName, sSsn)
    {
        //var sReqIcon = ' <img src="//img.echosting.cafe24.com/design/skin/default/member/ico_required.gif" alt="필수" />';
        //EC$('#nameTitle').html(sName+sReqIcon);
        EC$('#identification_check_nonauth').hide();

        if ( sSsn == '') {
            EC$('#ssnTitle').parent().hide();
            EC$('#identification_check_nonauth').hide();

        } else {
            EC$('#ssnTitle').parent().show();
        }
        EC$('#ssnTitle').html(sSsn);
    };


};

//실명인증 encrypt
function checkRealName()
{
    var aTarget = ['joinForm::check_member_type', 'joinForm::real_name', 'joinForm::real_ssn1', 'joinForm::real_ssn2'];
    if (typeof(bModify) == "boolean") {
        aTarget = ['editForm::real_name', 'editForm::real_ssn1', 'editForm::real_ssn2'];
    }
    var name = EC$('#real_name').val();
    var ssn1 = EC$('#real_ssn1').val();
    var ssn2 = EC$('#real_ssn2').val();

    if (!name) {
        alert(__('이름을 입력해 주세요.'));
        EC$('#real_name').focus();
        return false;
    }

    if (!ssn1 || !ssn2) {
        if (!ssn1) { EC$('#real_ssn1').focus(); } else { EC$('#real_ssn2').focus(); }
        alert(__('주민등록 번호를 입력해 주세요.'));
        return false;
    }

    if (EC$('#identification_check0:visible').length > 0) {
        if (EC$('#identification_check0:visible')[0].checked === false) {
            alert(__('고유식별정보 처리에 동의해 주세요.'));
            EC$('#identification_check0:visible').focus();
            return false;
        }
    }

    AuthSSL.encrypt(aTarget, 'encryptRequest');
}



//실명인증 callback Ajax
function encryptRequest(sOutput)
{
    var reqData = 'encrypted_str=' + encodeURIComponent(sOutput);

    if (typeof opener_object != 'undefined' && opener_object == 'board') {
        reqData += '&no_dupl_chk=y';
    }
    if (typeof(bModify) == "boolean") {
        reqData += '&bModify=T';
    }

    EC$.ajax({
        type: 'POST',
        url:  '/exec/front/Member/Realname/',
        data: reqData,
        dataType: 'json',
        success: function(response){
            try {
                alert(response['msg']);

                if (response['passed'] == true) {
                    EC$('#realNameEncrypt').val(response.registNameAuth);

                    // Protected 실명인증을 위해서 추가한 부분
                    if (EC$('#nameauth_result').length > 0) {
                        EC$('#nameauth_search').fadeOut(function() {
                            EC$('#nameauth_result').html(response.msg).fadeIn();
                        });
                    }

                    AuthSSLManager.weave({
                        'auth_mode'           : 'decryptClient',
                        'auth_string'         : response['data'],
                        'auth_callbackName'   : 'callBackNameAuth'
                   });
                
                 try{
                     // 남 세팅 
                     if ( response['sex'] == '1' ) { EC$('input[name="is_sex"]')['0'].click(); }
    
                     // 여 세팅
                     else{ EC$('input[name="is_sex"]')['1'].click(); }
                 }catch(e){}
                 
                }                
            } catch(e) {}

        }

    });
}

function callBackNameAuth(output){
    try {
            var output = decodeURIComponent(output);
            if ( AuthSSLManager.isError(output) == true ) {
                alert(output);
                return;
            }
            var data = AuthSSLManager.unserialize(output);

            EC$('#nameContents').html(data['name']);
            EC$('#ssnContents').html(data['ssn1'] + '- *******');

            if (response.needToCheckUnderFourteen == true) checkIsUnder14({ ssn1 : data['ssn1'] });

            if (opener_object == 'board') {
                opener.bNameAuth = false;
            }

            EC$('div#notify_'+opener_object).show();

    } catch(e) {}
}

function getNameauthValidate()
{
    var name = EC$('#real_name').val();
    var ssn1 = EC$('#real_ssn1').val();
    var ssn2 = EC$('#real_ssn2').val();

    if (!name) {
        alert(__('이름을 입력해 주세요.'));
        EC$('#real_name').focus();
        return false;
    }

    if (!ssn1 || !ssn2) {
        if (!ssn1) { EC$('#real_ssn1').focus(); } else { EC$('#real_ssn2').focus(); }
        alert(__('주민등록 번호를 입력해 주세요.'));
        return false;
    }

    return true;
}
EC$(function() {
    EC$('#nameauth_bt').off().click(function() {
        if (getNameauthValidate() === true) {
            if (EC$('#identification_check')[0].checked !== true) {
                alert(__('고유식별정보 처리에 동의해 주세요.'));
                EC$('#identification_check').focus();
                return false;
            }
            AuthSSL.encrypt([ 'nameauth_form::real_name', 'nameauth_form::real_ssn1', 'nameauth_form::real_ssn2'], 'encryptRequest');
        } else {
            return false;
        }
    });
});

/**
 * 만 14세 미만 체크
 * @param object params { birth : 'Ymd', ssn1 : '주민등록번호 앞 7자리' }. 둘 중 하나 필요
 */
function checkIsUnder14(params)
{
    var iBirthYear, iAge;

    params = params || {};

    iBirth = params.ssn1 ? (params.ssn1[0] == '0' ? '20' : '19') + params.ssn1.substring(0, 6) :
                 params.birth ? params.birth : null;    if (iBirth == null) return;

    dateUtil.init({'format' : 'yyyymmdd'});

    iDiff = dateUtil.toDay() - parseInt(iBirth) - 140000;

    if (iDiff < 0) {
        // 14세 미만 회원가입 설정에 따른 안내 메세지 설정
        switch (EC$('#is_under14_joinable').val()) {
            case 'F':
                EC$('#under14Msg').text('* 14세 미만 아동은 회원가입 할 수 없습니다.');
                break;
            case 'M':
                EC$('#under14Msg').text('* 14세 미만 사용자는 법정대리인 동의가 필요합니다.');
                break;
            default:
                EC$('#under14Msg').text('');
                break;
        }

        EC$('#under14Msg').removeClass('displaynone');
    } else {
        EC$('#under14Msg').addClass('displaynone');
    }
}


/**
 *  ipin popup
 */
function ipinPopup( sMallId )
{
    if ( sMallId == "" ) { alert(__('올바르지 않은 요청입니다.')); return false; }

    window.name = 'ipin_parent_window';
    if (bMobileWeb == false) window.open('', 'popupIpin','width=448, height=500');

    var returnPort = location.protocol === 'https:' ? 443 : 80;
    var returnUrlParam = '';

    if (EC$('#is_sms').val() != '' && EC$('#is_sms').val() != undefined) {
        returnUrlParam = '?is_sms=' + EC$('#is_sms').val();
    }

    if (EC$('#is_news_mail').val() != '' && EC$('#is_news_mail').val() != undefined) {
        var sTemp = 'is_news_mail=' + EC$('#is_news_mail').val();
        returnUrlParam = returnUrlParam == '' ? '?'+sTemp : returnUrlParam+'&'+sTemp;
    }

    if (EC_FRONT_JS_CONFIG_MEMBER.sIsSnsJoin != undefined && EC_FRONT_JS_CONFIG_MEMBER.sIsSnsJoin == 'T') {
        var sTemp = 'sIsSnsJoin=' + EC_FRONT_JS_CONFIG_MEMBER.sIsSnsJoin;
        returnUrlParam = returnUrlParam == '' ? '?'+sTemp : returnUrlParam+'&'+sTemp;
    }

    if (EC$('input[name^=agree_privacy_optional_check]').val() != '' && EC$('input[name^=agree_privacy_optional_check]').val() != undefined) {
        var sTemp = 'agree_privacy_optional_check=' + EC$('input[name^=agree_privacy_optional_check]').val();
        returnUrlParam = returnUrlParam == '' ? '?'+sTemp : returnUrlParam+'&'+sTemp;
    }

    //SSL 안타기 위해 joinForm 에서 보내지 않고 직접 만들어 보냄
    var sIpinForm = '<form id="ipinForm" method="get" action="'+EC_FRONT_JS_CONFIG_MEMBER.sAuthUrl+'" class="testClass">';
    sIpinForm += '<input type="hidden" name="service" value="echosting" />';
    sIpinForm += '<input type="hidden" name="action" value="auth">';
    sIpinForm += '<input type="hidden" name="authModule" value="nice" />';
    sIpinForm += '<input type="hidden" name="authType" value="ipin" />';
    sIpinForm += '<input type="hidden" name="method" value="GET" />';
    sIpinForm += '<input type="hidden" name="mallId" value="'+sMallId+'" />';
    sIpinForm += '<input type="hidden" name="mallVersion" value="shop19" />';
    sIpinForm += '<input type="hidden" name="returnUrl" value="' + document.domain + '/exec/front/Member/IpinResult/' + returnUrlParam +'" />';
    sIpinForm += '<input type="hidden" name="returnPort" value="' + returnPort + '" />';
    sIpinForm += '<input type="hidden" name="param1" value="join" />';
    sIpinForm += '<input type="hidden" name="param2" value="" />';
    sIpinForm += '<input type="hidden" name="param3" value="" />';
    sIpinForm += '</form>';

    if ( EC$('#ipinForm').html() == null ) EC$('body').append(sIpinForm);

    EC$('#ipinForm').attr('target', 'popupIpin');
    EC$('#ipinForm').submit();
}

/**
 *  mobile auth popup
 */
function mobilePopup( sMallId , AuthModule )
{
    if ( sMallId == "" ) { alert(__('올바르지 않은 요청입니다.')); return false; }

    var returnPort = location.protocol === 'https:' ? 443 : 80;
    var returnUrlParam = '';

    if (EC$('#is_sms').val() != '' && EC$('#is_sms').val() != undefined) {
        returnUrlParam = '?is_sms=' + EC$('#is_sms').val();
    }

    if (EC$('#is_news_mail').val() != '' && EC$('#is_news_mail').val() != undefined) {
        var sTemp = 'is_news_mail=' + EC$('#is_news_mail').val();
        returnUrlParam = returnUrlParam == '' ? '?'+sTemp : returnUrlParam+'&'+sTemp;
    }

    if (EC_FRONT_JS_CONFIG_MEMBER.sIsSnsJoin != undefined && EC_FRONT_JS_CONFIG_MEMBER.sIsSnsJoin == 'T') {
        var sTemp = 'sIsSnsJoin=' + EC_FRONT_JS_CONFIG_MEMBER.sIsSnsJoin;
        returnUrlParam = returnUrlParam == '' ? '?'+sTemp : returnUrlParam+'&'+sTemp;
    }

    if (EC$('input[name="agree_privacy_optional_check[]"]').val() != '' && EC$('input[name="agree_privacy_optional_check[]"]').val() != undefined) {
        var sTemp = 'agree_privacy_optional_check=' + EC$('input[name="agree_privacy_optional_check[]"]').val();
        returnUrlParam = returnUrlParam == '' ? '?'+sTemp : returnUrlParam+'&'+sTemp;
    }

    //SSL 안타기 위해 joinForm 에서 보내지 않고 직접 만들어 보냄
    var sMobileForm = '<form id="MauthForm" name="MauthForm" method="get" action="'+EC_FRONT_JS_CONFIG_MEMBER.sAuthUrl+'" class="testClass">';
    sMobileForm += '<input type="hidden" name="action" value="auth">';
    sMobileForm += '<input type="hidden" name="service" value="echosting" />';
    sMobileForm += '<input type="hidden" name="authModule" value="'+AuthModule+'" />';
    sMobileForm += '<input type="hidden" name="authType" value="mobile" />';
    sMobileForm += '<input type="hidden" name="method" value="GET" />';
    sMobileForm += '<input type="hidden" name="mallId" value="'+sMallId+'" />';
    sMobileForm += '<input type="hidden" name="mallVersion" value="shop19" />';
    sMobileForm += '<input type="hidden" name="returnUrl" value="' + document.domain + '/exec/front/Member/MauthResult/' + returnUrlParam +'" />';
    sMobileForm += '<input type="hidden" name="returnPort" value="' + returnPort + '" />';
    sMobileForm += '<input type="hidden" name="param1" value="join" />';
    sMobileForm += '<input type="hidden" name="param2" value="" />';
    sMobileForm += '<input type="hidden" name="param3" value="" />';
    sMobileForm += '</form>';

    if ( EC$('#MauthForm').html() == null ) EC$('body').append(sMobileForm);

    fnMobilePopup();
}

/**
 *  mobile auth popup call ECHOSTING-54546 이슈로 추가됨.
 */
function fnMobilePopup() {
    var popupName = 'auth_popup';
    var width  = 410;
    var height = 500;
    var leftpos = screen.width  / 2 - ( width  / 2 );
    var toppos  = screen.height / 2 - ( height / 2 );
    var winopts  = "width=" + width   + ", height=" + height + ", toolbar=no,status=no,statusbar=no,menubar=no,scrollbars=no,resizable=no";
    var position = ",left=" + leftpos + ", top="    + toppos;
    if (bMobileWeb == false) var AUTH_POP = window.open('', popupName, winopts + position);
    document.forms['MauthForm'].target = popupName;
    document.forms['MauthForm'].submit();
}

/**
 * 사업자 인증
 *
 * @package app/Member
 * @subpackage Resource
 * @author 이장규
 * @since 2011. 10. 13.
 * @version 1.0
 *
 */
var CompanyCheck = new function()
{
    /**
     * 사업자 인증 체크 main method
     * @return bool (성공, 실패)
     */
    this.checkDupl = function()
    {
        if ( action() == false) return false;
        
        AuthSSLManager.weave({
            'auth_mode': 'encrypt'
            , 'aEleId': ['joinForm::bname', 'joinForm::bssn1', 'joinForm::bssn2']
            , 'auth_callbackName': 'CompanyCheck.process'
        });
        
    };
    
    /**
     * 인증 process
     */
    this.process = function(sOutput)
    {
        
        EC$.ajax({
            url: '/exec/front/Member/CheckCompany',
            cache: false,
            type: 'POST',
            dataType: 'json',
            data: '&encrypted_str='+encodeURIComponent(sOutput),
            timeout: 30000,
            success: function(response){
                alert(response['msg']);
                if (response['passed'] == true) {
                    EC$('#nameContents').html(EC$('#bname').val());//법인명
                    EC$('#ssnContents').html(EC$('#bssn1').val() + '-*******');//법인번호
                    EC$('#companyName').html(EC$('#bname').val());
                    EC$('#realNameEncrypt').val(response['registNameAuth']);
                }
            }
        });
    };
    
    /**
     * validate
     * @return bool validate 결과
     */
    var action = function()
    {
        if ( EC_UTIL.trim(EC$('#bname').val()).length < 1 ) {
            alert(__('법인명을 입력하세요.'));
            EC$('#bname').focus();
            return false;
        }
        
        if (EC_UTIL.trim(EC$('#bssn1').val()).length < 1) {
            alert(__('법인번호를 입력하세요.'));
            EC$('#bssn1').focus();
            return false;
        }
        
        if (EC_UTIL.trim(EC$('#bssn2').val()).length < 1) {
            alert(__('법인번호를 입력하세요.'));
            EC$('#bssn2').focus();
            return false;
        }
        
        return true;

    };
    

    
    
    
};

/**
 * 외국인 번호 체크
 *
 * @package app/Member
 * @subpackage Resource
 * @author 백충덕, 이장규
 * @since 2011. 10. 17.
 * @version 1.0
 *
 */

/**
 * 외국인 번호 체크
 */
function checkForeignerNumber()
{

    var foreignerType = EC$('input[name=foreigner_type]:checked').val();
    var foreignerName = EC$('#foreigner_name').val();
    var foreignerSsn  = EC$('#foreigner_ssn').val();

    if (EC_UTIL.trim(foreignerName).length < 1) {
        alert(__('이름을 입력해 주세요.'));
        EC$('#foreigner_name').focus();
        return false;
    }

    if (EC_UTIL.trim(foreignerSsn).length < 1) {
        var sType = '';
        if (foreignerType == 'f') sType = __('외국인 등록번호');
        else if (foreignerType == 'p') sType = __('여권번호');
        else if (foreignerType == 'd') sType = __('국제운전면허증번호');

        alert(sprintf(__('%s를 입력해 주세요.'), sType));
        EC$('#foreigner_ssn').focus();
        return false;
    }
    
    if (EC$('#f_identification_check0').length > 0) {
        if (EC$('#f_identification_check0')[0].checked === false) {
            alert(__('고유식별정보 처리에 동의해 주세요.'));
            EC$('#f_identification_check0').focus();
            return false;
        }
    }    

    
    AuthSSLManager.weave({
        'auth_mode': 'encrypt'
        , 'aEleId': ['joinForm::foreigner_name', 'joinForm::foreigner_type', 'joinForm::foreigner_ssn']
        , 'auth_callbackName': 'callbackForeignerCheck'
    });
}

/**
 * 외국인 번호 체크 callback
 * */
function callbackForeignerCheck(sOutput)
{
    EC$.ajax({
        url: '/exec/front/Member/CheckForeigner',
        cache: false,
        type: 'POST',
        dataType: 'json',
        data: '&encrypted_str='+encodeURIComponent(sOutput),
        timeout: 30000,
        success: function(response){
            alert(response['msg']);
            if (response['passed'] == true) {
                EC$('#realNameEncrypt').val(response['registNameAuth']);
                EC$('#nameContents').html(EC$('#foreigner_name').val());

                var sTmpFssn = EC$('#foreigner_ssn').val();
                EC$('#ssnContents').html('***' + sTmpFssn.slice(-4));
            }
        }
    });
}

/**
 * 닉네임 중복 체크
 */
function checkNick()
{
    var sNickName = EC_UTIL.trim(EC$('#nick_name').val());
    var bIsLength = checkLength(sNickName);
    
    if (bIsLength['passed'] == false) {
        EC$('#nickMsg').html(bIsLength['msg']);
        return false;
    }
    
    EC$.ajax({
        url: '/exec/front/Member/CheckNick',
        cache: false,
        type: 'POST',
        dataType: 'json',
        data: '&nickName=' + sNickName,
        timeout: 30000,
        success: function(response){
            
            EC$('#nickMsg').html(response['msg']);
            
            if (response['passed'] == true) { 
                EC$('#nick_name_confirm').val('T');
            } else {
                EC$('#nick_name_confirm').val('F');
            }
            
        }
    });
}

/**
 * 닉네임 글자수 체크
 * @param sNickName 닉네임
 * @returns {Boolean}
 */
function checkLength(sNickName)
{
        
    if (EC$('#nick_name_flag').val() != 'T') return {'passed' : true};//닉네임 사용 안함    
    
    var iBtye = 0;
    
    for (var i = 0; i < sNickName.length; i++) {
        
        if (sNickName.charCodeAt(i) > 128) {
            iBtye += 2;
        } else {
            iBtye += 1;
        }
    }
    
    if (iBtye < 4)
        return {'passed' : false, 'msg' : __('한글 2자 이상/영문 대소문자 4자/숫자 혼용 사용 가능합니다.')};        


    if (iBtye > 20)        
        return {'passed' : false, 'msg' : __('한글 10자 이하/영문 대소문자 20자/숫자 혼용 사용 가능합니다.')};

    return {'passed' : true};
}

/**
 * 아이디 중복 체크
 */
function checkDuplId()
{
    if (EC$('#etc_subparam_member_id').length > 0) {
        var sMemberId = EC$('#etc_subparam_member_id').val();
        var aEleId = [EC$('#etc_subparam_member_id')];
    } else {
        var sMemberId = EC_UTIL.trim(EC$('#joinForm').find('#member_id').val());
        var aEleId = [EC$('#joinForm #member_id')];
    }

    var bCheck = checkIdValidation(sMemberId);

    if (bCheck['passed'] == false) {
        EC$('#idMsg').addClass('error').html(bCheck['msg']);
        return false;
    }

    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': aEleId,
        'auth_callbackName': 'checkIdEncryptedResultForMobile'
    });
}

/**
 * 아이디중복체크 암호화 처리 (모바일)
 * @param output
 */
function checkIdEncryptedResultForMobile(output)
{
    var sEncrypted = encodeURIComponent(output);

    if (AuthSSLManager.isError(sEncrypted) == true) {
        return;
    }

    EC$.ajax({
        url: '/exec/front/Member/CheckId',
        cache: false,
        type: 'POST',
        dataType: 'json',
        data: '&encrypted_str=' + sEncrypted + '&Country=' + SHOP.getLanguage(),
        timeout: 30000,
        success: function(response){
            var msg = response['msg'];

            try {
                msg = decodeURIComponent(msg);
            } catch (err) {}

            if (response['passed'] == true) {
                EC$('#idMsg').removeClass('error');
                EC$('#idMsg').html(msg);
                EC$('#idDuplCheck').val('T');
            } else {
                EC$('#idMsg').addClass('error').html(msg);
                EC$('#idDuplCheck').val('F');
            }
        }
    });
}

/**
 * 글자수 체크
 * @param 회원아이디 닉네임
 * @returns {Boolean}
 */
function checkIdValidation(sMemberId)
{
    if (sMemberId.length == 0 )
        return {'passed' : false, 'msg' : __('아이디를 입력해 주세요.')};

    if (sMemberId.length < 4 || sMemberId.length > 16)
        return {'passed' : false, 'msg' : __('아이디는 영문소문자 또는 숫자 4~16자로 입력해 주세요.')};

    return {'passed' : true};
}

function validatePassword()
{
    if (EC$('#passwd').val() == '' || EC$('#user_passwd_confirm').val() == '') {
        alert(__('비밀번호 항목은 필수 입력값입니다.'));
        return false;
    }

    var sPasswdType = (EC$('#passwd_type').val() == '' || EC$('#passwd_type').length < 1 ) ? 'A' : EC$('#passwd_type').val();

    // 비밀번호 조합 체크
    var passwd_chk = ckPwdPattern(EC$('#passwd').val(), sPasswdType);

    if (passwd_chk !== true) {

        // 뉴상품 구분
        if (typeof(SHOP) == 'object' && SHOP.getProductVer() > 1) {

        } else {
            // 구상품용 알럿 처리
            return oldPasswdChk('passwd', sPasswdType);
        }


        var sMsgWord = __("입력 가능 특수문자 :  ~ ` ! @ # $ % ^ ( ) _ - = { } [ ] | ; : < > , . ? /");
        var aMsgWord = sMsgWord.split(':');
        var aMsgWordSub = {};

        if (sPasswdType == 'A') {
            var sMsg = ''
                + __('비밀번호 입력 조건을 다시 한번 확인해주세요.') + "\n"
                + "\n"
                + '※ ' + __('비밀번호 입력 조건') + "\n"
                + '- ' + __('대소문자/숫자 4자~16자') + "\n"
                + '- ' + __('특수문자 및 공백 입력 불가능') + "\n";
        } else {
            if (sPasswdType == 'B') {
                aMsgWordSub = __('대소문자/숫자/특수문자 중 2가지 이상 조합, 8자~16자');
            } else if (sPasswdType == 'C') {
                aMsgWordSub = __('대소문자/숫자/특수문자 중 2가지 이상 조합, 10자~16자');
            } else if (sPasswdType == 'D') {
                aMsgWordSub = __('대소문자/숫자/특수문자 중 3가지 이상 조합, 8자~16자');
            }
            var sMsg = ''
                + __('비밀번호 입력 조건을 다시 한번 확인해주세요.') + "\n"
                + "\n"
                + '※ ' + __('비밀번호 입력 조건') + "\n"
                + '- ' + aMsgWordSub + "\n"
                + '- ' + aMsgWord[0] + "\n" + "  " + aMsgWord[1] + ":" + aMsgWord[2] + "\n"
                + '- ' + __('공백 입력 불가능') + "\n";
        }

        if (sMsg) alert(sMsg);

        EC$('#passwd').focus();
        return false;
    }
}

/**
 * 비밀번호 확인 체크
 */
function checkPwConfirm(sType) {

    if (sType == 'new_passwd_confirm') {
        var sPasswdInput = '#new_passwd';
        var sPasswdConfirmInput = '#new_passwd_confirm';
        var sElementIdMsg = '#new_pwConfirmMsg';
    } else if (sType == 'etc_subparam_user_passwd_confirm') {
        var sPasswdInput = '#etc_subparam_passwd';
        var sPasswdConfirmInput = '#etc_subparam_user_passwd_confirm';
        var sElementIdMsg = '#pwConfirmMsg';
    } else {
        var sPasswdInput = '#passwd';
        var sPasswdConfirmInput = '#user_passwd_confirm';
        var sElementIdMsg = '#pwConfirmMsg';
    }

    var sPasswd = EC_UTIL.trim(EC$(sPasswdInput).val());
    var sPasswdConfirm = EC_UTIL.trim(EC$(sPasswdConfirmInput).val());
    
    if (sPasswd != sPasswdConfirm) {
        EC$(sElementIdMsg).addClass('error').html(__('비밀번호가 일치하지 않습니다.'));        
    } else {
        EC$(sElementIdMsg).removeClass('error').html(' ');
    }
}

function oldPasswdChk(sPasswdId, sPasswdType)
{
    var oCheckErrorMessage = {
        A : __('4~16자로 입력해 주세요.'),
        B : __('영문 대소문자, 숫자, 또는 특수문자 중 2가지 이상 조합하여 8~16자로 입력해 주세요.'),
        C : __('영문 대소문자, 숫자, 또는 특수문자 중 2가지 이상 조합하여 10~16자로 입력해 주세요.'),
        D : __('비밀번호는 영문 대소문자/숫자/특수문자 중 3가지 이상 조합,8자 ~ 16자로 설정하셔야 합니다.')
    };

    var sDefaultErrorMessage = __("공백 또는 허용된 특수문자 (~ ` ! @ # $ % ^ ( ) _ - = { [ } ] ; : < > , . ? /) 외의 특수문자는 사용할 수 없습니다.");
    var sDefaultErrorMessage2 = __("공백 또는 허용 불가한 특수문자는 사용할 수 없습니다.");

    if (sPasswdType == 'A') {
        sDefaultErrorMessage = sDefaultErrorMessage2;
    }

    // 비밀번호 조합 체크
    var passwd_chk = ckPwdPattern(EC$('#' + sPasswdId).val(), sPasswdType);
    if (passwd_chk !== true) {
        EC$('#' + sPasswdId).focus();

        var sMessage = passwd_chk == 'F' ? sDefaultErrorMessage : oCheckErrorMessage[sPasswdType];

        alert(sMessage);

        return false;
    }
    return true;
}

/**
 * 비밀번호 체크
 */
function ckPwdPattern(sPwd, sPwdType)
{
    if (sPwdType == 'A') {
        var pattern = /^[a-zA-Z0-9]{4,16}$/; //조합없이 4~16
        var chk = (pattern.test(sPwd)) ? true : 'F';
        // 4보다 작거나 16보다 큰경우
        if (sPwd.length < 4 || 16 < sPwd.length) {
            chk = false;
        }
        return chk;
    } else {
        var chars1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'; //영대소문자
        var chars2 = '0123456789'; //숫자
        var chars3 = '\~\`\!\@\#\$\%\^\(\)\_\-\=\{\}\[\]\|\;\:\<\>\,\.\?\/';

        var s = containsChar(sPwd, chars1, chars2, chars3);
        var s1 = s.split("/");
        var check_length = 0;

        if (s1[0] > 0) {
            check_length = parseInt(check_length)+parseInt(s1[0]);
            s1[0] = 1;
        }
        if (s1[1] > 0) {
            check_length = parseInt(check_length)+parseInt(s1[1]);
            s1[1] = 1;
        }
        if (s1[2] > 0) {
            check_length = parseInt(check_length)+parseInt(s1[2]);
            s1[2] = 1;
        }

        //영대문자, 숫자, 특수문자 중 2가지 이상 조합이면
        if ((parseInt(s1[0]) + parseInt(s1[1]) + parseInt(s1[2])) >= 2) {
            if (sPwdType == 'B') {
                if (sPwd.length >= 8 && sPwd.length <=16) {
                    if (sPwd.length > check_length) {//허용되지 않은 문자가 포함된 경우
                        return 'F';//허용되지 않은 문자가 포함됨
                    } else {
                        return true;
                    }
                } else {
                    return false;//8자~16자가 안됨
                }
            } else if (sPwdType == 'C') {
                if (sPwd.length >= 10 && sPwd.length <=16) {
                    if (sPwd.length > check_length) {
                        return 'F';
                    } else {
                        return true;
                    }
                } else {
                    return false;//10자~16자가 안됨
                }
            } else if (sPwdType == 'D') {
                if (parseInt(s1[0]) + parseInt(s1[1]) + parseInt(s1[2]) != 3)
                    return false;

                if (sPwd.length >= 8 && sPwd.length <=16) {
                    if (sPwd.length > check_length) {
                        return 'F';
                    } else {
                        return true;
                    }
                } else {
                    return false;//8자~16자가 안됨
                }
            } else {
                return false;
            }
        } else {
            return false; //영문대소문자, 숫자, 특수문자 2가지 조합이 안됨
        }
    }
}

function containsChar(input, chars1, chars2, chars3)
{
    var cnt1 = 0;
    var cnt2 = 0;
    var cnt3 = 0;

    for (var i=0; i<input.length; i++)
    {
        //영대소문자 포함여부
        if (chars1.indexOf(input.charAt(i))!= -1) {
            cnt1++;
        }
        //숫자 포함여부
        if (chars2.indexOf(input.charAt(i))!= -1) {
            cnt2++;
        }
        //특수문자 포함여부
        if (chars3.indexOf(input.charAt(i))!= -1) {
            cnt3++;
        }
    }
    return (cnt1+"/"+cnt2+"/"+cnt3);
}
/**
 * 이메일 중복 체크
 */
function checkDuplEmail()
{
    var aEleId = [];

    if ( EC$('#member_id').val() != '' && EC$('#member_id').val() != undefined ) {
        aEleId.push('member_id');
    }

    if (EC$('#email2').length > 0) {
        var sEmail = EC_UTIL.trim(EC$('#email1').val())+'@'+EC_UTIL.trim(EC$('#email2').val());
        aEleId.push('email1', 'email2');
    } else {
        if ( EC$('#etc_subparam_email1').val() != undefined ) {
            var sEmail = EC_UTIL.trim(EC$('#etc_subparam_email1').val());
            aEleId.push('etc_subparam_email1');
        } else {
            var sEmail = EC_UTIL.trim(EC$('#email1').val());
            aEleId.push('email1');
        }
    }

    var bCheck = checkEmailValidation(sEmail);
    if (bCheck['passed'] == false) {
        EC$('#emailMsg').addClass('error').html(bCheck['msg']);
        return false;
    }

    // 이메일 중복체크 동작 : 동작
    if (typeof bCheckedEmailDoing !== 'undefined') {
        bCheckedEmailDoing  = true;
    }

    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': aEleId,
        'auth_callbackName': 'checkEmailEncryptedResult'
    });

}

/**
 * 아이디중복체크 암호화 처리 (모바일)
 * @param output
 */
function checkEmailEncryptedResult(output)
{
    var sEncrypted = encodeURIComponent(output);

    if (AuthSSLManager.isError(sEncrypted) == true) {
        return;
    }

    EC$.ajax({
        url: '/exec/front/Member/CheckEmail',
        cache: false,
        type: 'POST',
        dataType: 'json',
        data: '&encrypted_str=' + sEncrypted,
        timeout: 30000,
        success: function(response) {
            var msg = response['msg'];
            try {
                msg = decodeURIComponent(msg);
            } catch (err) {
            }

            if (response['passed'] == true) {
                EC$('#emailMsg').removeClass('error').html(msg);
                EC$('#emailDuplCheck').val('T');

                if (SHOP.getLanguage() == 'ja_JP' && response['jp_email_check'] != '') {
                    checkSoftbankEmail(response['jp_email_check']);
                }

                // 중복 체크 성공 
                bCheckedEmailDupl = true;

                // 회원정보 수정중 여부
                if (typeof bMemberEditAction !== 'undefined' && bMemberEditAction) {
                    // 이메일 중복체크 동작 : 미동작
                    bCheckedEmailDoing  = false;
                    bMemberEditAction = false;
                    memberEditAction();
                }

                // 회원정보 가입중 여부
                if (typeof bMemberJoinAction !== 'undefined' && bMemberJoinAction) {
                    // 이메일 중복체크 동작 : 미동작
                    bCheckedEmailDoing  = false;
                    bMemberJoinAction = false;
                    // [ECHOSTING-382207] [컨버스코리아_자사몰] 국문몰도 이메일 로그인 회원가입 기능개선
                    var $oMemberId = '';
                    $oMemberId = EC$('#joinForm').find('#member_id');
                    if (response['id'] != null && $oMemberId.val() == '' && EC$('#login_id_type').val() == 'email') {
                        $oMemberId.val(response['id']);
                        EC$('#idDuplCheck').val('T');
                    }
                    memberJoinAction();
                }

                // SNS회원정보 가입중 여부
                if (typeof bSnsMemberJoinAction !== 'undefined' && bSnsMemberJoinAction) {
                    // 이메일 중복체크 동작 : 미동작
                    bCheckedEmailDoing  = false;
                    bSnsMemberJoinAction = false;
                    callEncryptFunctionStep2();
                }

            } else {
                // 비활성 계정이면 계정 활성화 초대 메일 발송 버튼 DOM 생성
                if (EC$("#emailMsg").length > 0
                    && EC_FRONT_JS_CONFIG_MEMBER.bIsDisplayActivationSendButton === true
                    && response['is_activation'] === false
                ) {
                    var sButtonName = __('SENDING.ACTIVATION.MAIL', 'MEMBER.JOIN.CHECK.EMAIL');
                    var sMemberId = response['member_id'];
                    var sMemberInvitaionBuntton = '<button id="send_mail_activation_btn" class="btnBasic" type="button" onclick="sendAccountActivationMail(\''+ sMemberId +'\');" style="cursor: pointer;">'+ sButtonName +'</button>';
                    EC$('#emailMsg').after(sMemberInvitaionBuntton);

                    msg = __('REQUEST.MEMBER.JOIN', 'MEMBER.JOIN.CHECK.EMAIL');
                }

                EC$('#emailMsg').addClass('error').html(msg);
                EC$('#emailDuplCheck').val('F');
                bCheckedEmailDupl = false;
                // SNS 레이어에서 이메일항목에 값이 들어간상태로 바로 submit한경우 이메일 중복체크후 중복된 이메일이라면 Alert
                if (EC$('#email1').parents().find('#sns_join').length > 0 && bMemberJoinAction === true) {
                    bMemberJoinAction = false;
                    alert( __("이미 가입된 이메일 주소입니다.\n쇼핑몰 가입여부를 다시 확인하여 주시거나 관리자에게 문의하여 주세요.") );
                }
            }

            // 추천아이디 중복체크 완료 (회원가입, 수정페이지 둘다쓰임)
            var $oMemberId = '';
            if (EC$('#etc_subparam_member_id').val() != undefined) {
                $oMemberId = EC$('#etc_subparam_member_id');
            } else {
                $oMemberId = EC$('#joinForm').find('#member_id');
            }
            if (response['id'] != null && $oMemberId.val() == '' && EC$('#login_id_type').val() == 'email') {
                $oMemberId.val(response['id']);
                EC$('#idDuplCheck').val('T');
                EC$('#idMsg').removeClass('error').html(__('추천아이디이므로 그대로 사용할 수 있으며, 수정도 가능합니다.'));
            }
        }, complete : function() {
            if (typeof bCheckedEmailDoing !== 'undefined') {
                // 이메일 중복체크 동작 : 미동작
                bCheckedEmailDoing  = false;
            }
        }
    });
}

/**
 * 글자수 체크
 * @param 회원아이디 닉네임
 * @returns {Boolean}
 */
function checkEmailValidation(sEmail)
{       
    if (sEmail.length == 0 )
        return {'passed' : false, 'msg' : __('이메일을 입력해 주세요.')};
    
    if (FwValidator.Verify.isEmail(sEmail) == false || sEmail.length > 255)
        return {'passed' : false, 'msg' : __('유효한 이메일을 입력해 주세요.')};

    return {'passed' : true};
}

/**
 * 소프트뱅크 메일여부 체크
 * @param sEmail 이메일주소
 */
function checkSoftbankEmail(jp_email_check)
{
    if (SHOP.getLanguage() != 'ja_JP') return;
    
    // 모바일 구디자인의 경우 emailMsg가 없어서 처리 해줌 ( memberJoin에 같은 소스가 있는데 모바일일 경우 중복 노출 되어 위치 이동 시킴 )
    if ( EC$("#emailMsg").length > 0) {
        
        if (jp_email_check == 'jp_email_wanning') {
            EC$('#emailMsg').html('ご入力のアドレスはMMSサービスとなり、大容量のデータ受信ができかねます。');
        }
    } else {
        
        var bExistEmailBtn = false;
        if (EC$('#check_email_button').length > 0) bExistEmailBtn = true;
        (bExistEmailBtn == true) ? EC$('#check_email_button').next('p').remove() : EC$('#email1').next('p').remove();
        
        if (jp_email_check == 'jp_email_wanning') {
            $sInfoText = '<p style="color:#747474;">ご入力のアドレスはMMSサービスとなり、大容量のデータ受信ができかねます。</p>';
            if (bExistEmailBtn) {
                EC$('#check_email_button').after($sInfoText);
            } else {
                EC$('#email1').after($sInfoText);
            }
        }
    }
}
/**
 * 개인사업자번호 중복 체크
 */
function checkCssnDupl()
{
    var sCssn = EC$('#cssn').val();

    if (sCssn == '') {
        EC$('#cssnMsg').addClass('error').html(__('올바른 사업자번호를 입력해 주세요.'));
        return false;
    }

    var aData = ['cssn'];
    var bIsLogin = document.cookie.match(/(?:^| |;)iscache=F/) ? true : false;

    // 수정 페이지에서 넘어왔다면
    if (bIsLogin) {
        aData.push('member_id');
    }

    // ssl 암호화 처리
    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': aData,
        'auth_callbackName': 'callbackCssnCheck'
    });
}

/**
 * 개인사업자번호 체크 callback
 */
function callbackCssnCheck(sOutput)
{
    EC$.ajax({
        url: '/exec/front/Member/CheckCssn',
        cache: false,
        type: 'POST',
        dataType: 'json',
        data: '&encrypted_str='+encodeURIComponent(sOutput),
        timeout: 30000,
        success: function(response){
            if (response['passed'] == true) {
                EC$('#cssnMsg').removeClass('error').html(response['msg']);
                EC$('#cssnDuplCheck').val('T');
            } else {
                EC$('#cssnMsg').addClass('error').html(__(response['msg']));
                EC$('#cssnDuplCheck').val('F');
            }
        }
    });
}

/**
 * 사업자 번호 valid 체크
 * @return Boolean
 */
function checkCssnValid(sCssn)
{
    // 정규식 체크
    var regexp = /^([0-9]{3})-([0-9]{2})-([0-9]{5})$/;
    var regexp2 = /^([0-9]{10})$/;
    if (regexp.test(sCssn) === false && regexp2.test(sCssn) === false) {
        EC$('#cssnMsg').addClass('error').html(__('올바른 사업자번호를 입력해 주세요.'));
        return false;
    } else {
        EC$('#cssnMsg').removeClass('error').html(__('사용 가능합니다.'));
        return true;
    }
}
/**
 * 가입 정보 확인
 */

EC$(function(){
    EC$("#ec_shop_confirm-checkingjoininfo_action").click(function(){
        return CheckingJoinInfoOk();
    });
});

function CheckingJoinInfoLayerClose()
{
    EC$('#ec_shop_member_confirm-infolayer').css("display","none");    
    return false;
}

function CheckingJoinInfoOk()
{
    EC$("#is_use_checking_join_info").val('F');
    return memberJoinAction();
}

function CheckingJoinInfo() {
    var obj;
    var pobj=EC$("#ec_shop_member_confirm-infolayer");
    if (pobj.length === 0) {
        return false;
    }
    
    var bExits = true;
    // 가입 사전 체크
    try{
        if (AuthSSL.bIsSsl) {
            var aEleId = FormSSLContainer.aFormSSL['joinForm'].aEleId;        
            AuthSSLManager.weave({
                'auth_mode'        : 'encrypt',
                'aEleId'           : aEleId,
                'auth_callbackName': "CheckingJoinInfoAuthsslSuccess"
            });    
        }
    }catch(e) {    
        bExits=false;
    }
        
    return bExits;
}

function CheckingJoinInfoAuthsslSuccess(sOutput) {
    if ( AuthSSLManager.isError(sOutput) == true ) {
        alert('[Error]\n'+sOutput);
        return;
    }

    EC$.ajax({
        type: 'POST',
        url:  '/exec/front/Member/Join/',
        data: {"encrypted_str":sOutput,"is_checking_join_info":"T"},
        dataType: 'json',
        success : CheckingJoinInfoCallback
    });
}

function CheckingJoinInfoCallback(response)
{
    try{        
        if (response.result!='1') {
            alert(__(response.msg));
            return true;
        }
    }catch(e){        
    }
    

    var obj;
    var pobj=EC$("#ec_shop_member_confirm-infolayer");
    pobj.css("display","block");    
    
    // 이름
    if (EC$("#nameContents > :input").length>0) {
        pobj.find("#ec_shop_member_confirm-name_contents").html( EC$("#nameContents > :input").val() );        
    } else {
        pobj.find("#ec_shop_member_confirm-name_contents").html( EC$("#nameContents").text() );        
    }    
    
    // 사업자        
    if (EC$("#companyRow").css("display")!=="none") {
        
        if (EC$("#companyName > :input").length>0) {
            EC$("#ec_shop_member_confirm-company_name").show().find("td").html( EC$("#companyName > :input").val() );
        } else {
            EC$("#ec_shop_member_confirm-company_name").show().find("td").html( EC$("#companyName").text() );
        }
        
        EC$("#ec_shop_member_confirm-company_ssn").show().find("td").html( EC$("#cssn").val() );
    } else {
        EC$("#ec_shop_member_confirm-company_name").hide();
        EC$("#ec_shop_member_confirm-company_ssn").hide();        
    }
    
    // 인증정보
    obj = EC$("#ec_shop_member_confirm-ssn_title");
    if (obj.length!==0) {
        EC$("#ec_shop_member_confirm-ssn_title").parent().show();        
        if (EC$("#ssnTitle").parent().css("display")!=="none") {
            pobj.find("#ec_shop_member_confirm-ssn_title").html( EC$("#ssnTitle").text() );
            pobj.find("#ec_shop_member_confirm-ssn_contents").html( EC$("#ssnContents").text() );
        }else{            
            EC$("#ec_shop_member_confirm-ssn_title").parent().hide();            
        }
    }
    
    // 국적
    obj = EC$("#ec_shop_member_confirm-nation");
    if (obj.length!==0) {
        EC$("#ec_shop_member_confirm-nation").show();        
        if (EC$("#nation").css("display")==="none") {
            EC$("#ec_shop_member_confirm-nation").hide();            
        }
    }

    // 국가
    var oCountry = EC$("#country");
    var sCountryCode = '';
    if (oCountry.length > 0) {
        sCountryCode = oCountry.val();
        // 국가코드가 2자리일 경우 3자리로 변환
        if (sCountryCode.length === 2) {
            sCountryCode = EC_ADDR_COMMONFORMAT_FRONT.convertCountryDomainToCode(sCountryCode);
        }
    }

    // city, state filed 노출 여부
    if (typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] === 'T') {
        // city
        var display = (EC$('#city_name').length) ? EC$('#city_name').css("display") : '';
        if (display.indexOf('block') > -1) display = '';
        EC$('tr:has(td:has(#ec_shop_member_confirm_field-city_name))').css("display",display);

        // state
        if (sCountryCode === 'USA' && EC$('#stateListUs').length) {
            display = EC$('#stateListUs').css("display");
        } else if (sCountryCode === 'CAN' && EC$('#stateListCa').length) {
            display = EC$('#stateListCa').css("display");
        } else if (EC$('#state_name').length) {
            display = EC$('#state_name').css("display");
        } else {
            display = '';
        }
        if (display.indexOf('block') > -1) display = '';
        EC$('tr:has(td:has(#ec_shop_member_confirm_field-state_name))').css("display",display);

    } else {
        var display = "";

        // city
        display = EC$('tr:has(td:has(#city_name))').css("display");
        EC$('tr:has(td:has(#ec_shop_member_confirm_field-city_name))').css("display",display);

        // state
        display = EC$('tr:has(td:has(#state_name))').css("display");
        EC$('tr:has(td:has(#ec_shop_member_confirm_field-state_name))').css("display",display);
    }

    // field    
    pobj.find("tr[class!='displaynone'] > td").find("span[id^='ec_shop_member_confirm_field-']").each(function(){
        var name = EC$(this).attr("id");
        name = name.replace("ec_shop_member_confirm_field-","");

        var query = "[name='"+name+"']";

        if (name==="") {
            return;
        }
        
        // 추가정보 체크박스 처리
        if (name.match(/add\d+/)) {
            query+=",:input[name='"+name+"[]']";
        }        
        else if ( name==="phone" || name==="mobile" || name==="inter_check") {
            query+=",:input[name='"+name+"[]']";
        }


        
        obj = EC$("#joinForm").find(":input"+query);        
                
        if (obj.length===0) {
            return;
        }

        var type = obj.prop("type");
        var value;        
        if (name==="phone" || name==="mobile") {
            value = obj.map(function () {
                return EC$(this).val();
            }).get().join('-');
        } else if (name == "is_sms" || name == "is_news_mail") {
            value = __('동의안함');
            if (obj.is(":checked") === true) {
                var sTempId = obj.filter(":checked").attr("id");
                value = EC$("#joinForm").find("label[for='"+sTempId+"']").text();
            }

            if (mobileWeb == true && obj.val() == 'T' && type !== "checkbox") {
                value = __('동의함');
            }
        } else if (type==="text" && obj.length===1) {
            value = obj.val();

            if (name == "fssn")  value = '***' + obj.val().slice(-4);
        } else if (type==="checkbox" && obj.length>0) {            
            if (name.match(/add\d+/)) {
                value = obj.filter(":checked").map(function(){
                    return EC$(this).val();
                }).get().join(', ');                                
            } else if (name==="inter_check") {
                value = obj.filter(":checked").map(function(){
                    var sTempId = EC$(this).attr("id");
                    return EC$("#joinForm").find("label[for='"+sTempId+"']").text();                    
                }).get().join(', ');
            }
        } else if (type==="select-one") {        
            if (obj.find("option:selected").val()=="") {
                value="";
            } else {
                value = obj.find("option:selected").text();
            }            
        } else if (type==="radio") {            
            var sTempId = obj.filter(":checked").attr("id");
            value = EC$("#joinForm").find("label[for='"+sTempId+"']").text();
        } else if (name == "addr1" && type==="hidden") {
            // 주소 input 창 변경으로 추가
            value = obj.val();
        }

        if (name === "state_name" && value == '') {
            value = EC$("#joinForm").find(":input[name='__"+name+"']").val();
        }

        if (EC$('#sUseSeparationNameFlag').val() == "T") {
            var aLastNameObject = ["name", "name_en", "name_phonetic"];
            var iLastNameObjectKey = EC$.inArray(name, aLastNameObject);
            if (iLastNameObjectKey > -1) {
                if (EC$("#joinForm").find(':input[name=last_' + aLastNameObject[iLastNameObjectKey] + ']').val() != undefined) {
                    value = obj.val() + " " + EC$("#joinForm").find(':input[name=last_' + aLastNameObject[iLastNameObjectKey] + ']').val();
                }
            }
        }

        if (name == "email1") {
            if (EC$("#ec_shop_member_confirm_field-email2").length > 0) {
                var aMail = value.split("@");
                value = aMail[0];
                EC$("#ec_shop_member_confirm_field-email2").html(aMail[1]);
            }
        }

        if (name == "email2") {
            if (value == "") {
                return true;
            }
        }

        EC$(this).html(value);
    });

    // 중국, 베트남 주소 처리
    if (sCountryCode !== '') {
        viewViVnAddress(sCountryCode);
        viewZhCnAddress(sCountryCode);
    }

    
    // 미입력값 삭제    
    obj = pobj.find("#ec_shop_member_confirm_field-birth_year");
    if (obj.length!==0) {
        obj.parent().find("span").show();
        if (
                pobj.find("#ec_shop_member_confirm_field-birth_year").text()==="" &&
                pobj.find("#ec_shop_member_confirm_field-birth_month").text()==="" &&
                pobj.find("#ec_shop_member_confirm_field-birth_day").text()===""
        ) {
            obj.parent().find("span").hide();
        }        
    }
    
    obj = pobj.find("#ec_shop_member_confirm_field-marry_year");
    if (obj.length!==0) {
        obj.parent().find("span").show();
        if (
                pobj.find("#ec_shop_member_confirm_field-marry_year").text()==="" &&
                pobj.find("#ec_shop_member_confirm_field-marry_month").text()==="" &&
                pobj.find("#ec_shop_member_confirm_field-marry_day").text()===""
        ) {
            obj.parent().find("span").hide();
        }
    }
    
    obj = pobj.find("#ec_shop_member_confirm_field-partner_year");
    if (obj.length!==0) {
        obj.parent().find("span").show();
        if (
                pobj.find("#ec_shop_member_confirm_field-partner_year").text()==="" &&
                pobj.find("#ec_shop_member_confirm_field-partner_month").text()==="" &&
                pobj.find("#ec_shop_member_confirm_field-partner_day").text()===""
        ) {
            obj.parent().find("span").hide();
        }
    }
    
    return true;
}

/**
 * 베트남 주소 처리
 * @param sCountryCode 국가코드
 */
function viewViVnAddress(sCountryCode)
{
    if (typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] === 'T') {
        if (sCountryCode !== "VNM") {
            return;
        }
    } else {
        if (SHOP.getLanguage() !== "vi_VN") {
            return;
        }
    }

    var oAddr1 = EC$("#addr1");
    if (oAddr1.length < 1) {
        return;
    }

    var oAddr2 = EC$("#addr2");
    if (oAddr2.length < 1) {
        return;
    }

    var oConfirmAddr1 = EC$("#ec_shop_member_confirm_field-addr1");
    var oConfirmAddr2 = EC$("#ec_shop_member_confirm_field-addr2");

    if (oConfirmAddr1.length < 1) {
        return;
    }

    oConfirmAddr1.html(oAddr2.val());

    if (oConfirmAddr2.length < 1) {
        return;
    }

    if (EC$("#ec_shop_member_confirm_field-city_name").parent().parent().css("display") != "none") {
        EC$("#ec_shop_member_confirm_field-city_name").parent().parent().css("display", "none");
    }

    if (EC$("#ec_shop_member_confirm_field-state_name").parent().parent().css("display") != "none") {
        EC$("#ec_shop_member_confirm_field-state_name").parent().parent().css("display", "none");
    }

    var sAddr1 = oAddr1.val();
    if (EC$('#city_name').length > 0) {
        if (EC_UTIL.trim(EC$('#city_name').val()) != "") {
            sAddr1 += " " + EC_UTIL.trim(EC$('#city_name').val());
        }
    }

    if (EC$('#state_name').length > 0) {
        if (EC_UTIL.trim(EC$('#state_name').val()) != "") {
            sAddr1 += " " + EC_UTIL.trim(EC$('#state_name').val());
        }
    }

    oConfirmAddr2.html(sAddr1);
}

/**
 * 중국 주소 처리
 * @param sCountryCode 국가코드
 */
function viewZhCnAddress(sCountryCode)
{
    if (typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] === 'T') {
        if (sCountryCode !== "CNN") {
            return;
        }
    } else {
        if (SHOP.getLanguage() !== "zh_CN") {
            return;
        }
    }

    var oConfirmAddr1 = EC$("#ec_shop_member_confirm_field-addr1");

    if (oConfirmAddr1.length < 1) {
        return;
    }

    try {
        var oAddr1Title = oConfirmAddr1.parent().parent().find("th");
        oAddr1Title.html(EC$('#sAddr1Title').text());
    } catch(e) {}
}
var memberCommon = (function() {

    var oAgreeCheckbox = [
        {"obj": EC$('input:checkbox[name="agree_service_check[]"]')},//이용약관 동의
        {"obj": EC$('input:checkbox[name="agree_privacy_check[]"]')}, // 개인정보 수집 및 이용 동의
        {"obj": EC$('input:checkbox[name="agree_privacy_optional_check[]"]'), 'sIsDisplayFlagId':"display_agree_privacy_optional_check_flag"}, // 개인정보 수집 및 이용 동의 (선택)
        {"obj": EC$('input:checkbox[name="agree_information_check[]"]'), "sIsDisplayFlagId":"display_agree_information_check_flag"}, // 개인정보 제3자 제공 동의(선택)
        {"obj": EC$('input:checkbox[name="agree_consignment_check[]"]'), "sIsDisplayFlagId":"display_agree_consignment_check_flag"}, // 개인정보 처리 위탁 동의
        {"obj": EC$('input:checkbox[name="is_sms"]'), "sIsDisplayFlagId":"required_is_sms_flag"}, // sms 수신 동의
        {"obj": EC$('input:checkbox[name="is_news_mail"]'), "sIsDisplayFlagId":"required_is_news_mail_flag"}, // 이메일 수신 동의
        {"obj": EC$('#sMarketingAgreeAllChecked')} // mobile 이메일 수신, sms 수신 동의 전체 체크
    ];

    var oMarketingAgreeCheckbox = [
        {"obj": EC$('input:checkbox[name="is_sms"]'), "sIsDisplayFlagId":"required_is_sms_flag"}, // sms 수신 동의
        {"obj": EC$('input:checkbox[name="is_news_mail"]'), "sIsDisplayFlagId":"required_is_news_mail_flag"}, // 이메일 수신 동의
    ];

    var oMarketingAgreeAllChecked = EC$('input:checkbox[id="sMarketingAgreeAllChecked"]');

    /**
     * 약관 일괄 동의 체크
     */
    function agreeAllChecked()
    {
        var bAgreeAllChecked = EC$('input:checkbox[id="sAgreeAllChecked"]').is(":checked");

        if (bAgreeAllChecked.length < 1) {
            return;
        }

        EC$.each(oAgreeCheckbox, function(i, oVal) {
            if (oVal.obj.length < 1) {
                // continue
                return true;
            }

            if (bAgreeAllChecked === true) {
                if (EC$('#'+oVal.sIsDisplayFlagId).length > 0) {
                    if (EC$('#'+oVal.sIsDisplayFlagId).val() != "T") {
                        return true;
                    }
                }
                oVal.obj.prop("checked", true);
            } else {
                oVal.obj.prop("checked", false);
            }
        });
    }

    /**
     * 약관 일괄 동의 체크 or 해제 처리
     */
    function agreeAllUnChecked(obj)
    {
        if (obj.length < 1) {
            return;
        }
        var sIsUnchecked = "F";
        if (obj.is(":checked") === false) {
            if (EC$('input:checkbox[id="sAgreeAllChecked"]').length > 0) {
                EC$('input:checkbox[id="sAgreeAllChecked"]').prop("checked", false);
            }
            sIsUnchecked = "T";

            // 모바일 쇼핑정보 수신 동의 선택 박스 언체크
            if (obj.attr("name") == "is_sms" || obj.attr("name") == "is_news_mail") {
                if (memberCommon.oMarketingAgreeAllChecked.length > 0) {
                    memberCommon.oMarketingAgreeAllChecked.prop("checked", false);
                }
            }
        }
        return sIsUnchecked;
    }

    /**
     * 모바일 마케팅 약관 일괄 동의 체크
     */
    function marketingAgreeAllCheckboxIsChecked()
    {
        var sIsAllChecked = "T";

        EC$.each(memberCommon.oMarketingAgreeCheckbox, function(i, oVal) {
            if (oVal.length < 1) {
                // continue
                return true;
            }

            if (oVal.obj.is(":checked") === false) {
                sIsAllChecked = "F";
                return false;
            }
        });

        if (sIsAllChecked == "T") {
            if (memberCommon.oMarketingAgreeAllChecked.length > 0) {
                memberCommon.oMarketingAgreeAllChecked.prop("checked", true);
            }
        }
    }

    /**
     * 모바일 sms, email 수신 동의 전체 선택
     */
    function marketingAllChecked()
    {
        if (memberCommon.oMarketingAgreeAllChecked.length < 1) {
            return;
        }
        var bAgreeAllChecked = memberCommon.oMarketingAgreeAllChecked.is(":checked");

        EC$.each(memberCommon.oMarketingAgreeCheckbox, function(i, oVal) {
            if (oVal.obj.length < 1) {
                // continue
                return true;
            }

            if (bAgreeAllChecked === true) {
                if (EC$('#'+oVal.sIsDisplayFlagId).length > 0) {
                    if (EC$('#'+oVal.sIsDisplayFlagId).val() != "T") {
                        return true;
                    }
                }
                oVal.obj.prop("checked", true);
            } else {
                oVal.obj.prop("checked", false);
            }
        });
    }

    /**
     * 모바일 sms, email 수신 동의 필수 입력 제거
     */
    function marketingRemoveFilter()
    {
        // sms 수신 동의
        if (EC$('input:checkbox[name="is_sms"]').length > 0) {
            if (EC$('input:checkbox[name="is_sms"]').attr("fw-filter").indexOf("isFill") > -1) {
                EC$('input:checkbox[name="is_sms"]').removeAttr("fw-filter");
            }
        }

        // 이메일 수신 동의
        if (EC$('input:checkbox[name="is_news_mail"]').length > 0) {
            if (EC$('input:checkbox[name="is_news_mail"]').attr("fw-filter").indexOf("isFill") > -1) {
                EC$('input:checkbox[name="is_news_mail"]').removeAttr("fw-filter");
            }
        }
    }

    /**
     * 전체 동의 외 체크박스 모두 체크시 전체 동의 체크
     */
    function eachCheckboxAgreeAllChecked()
    {
        var sIsAllChecked = "T";

        EC$.each(EC$('.agreeArea'), function(i, oVal) {
            if ((EC$(oVal).hasClass('displaynone')) === true) {
                return true;
            }

            EC$.each(EC$(oVal).find("input:checkbox"), function(j, oVal2) {
                // 심플디자인 전체 동의 버튼 제외 처리
                if (EC$(oVal2).attr('id') == "sAgreeAllChecked") {
                    return true;
                }
                
                if (EC$(oVal2).is(":checked") === false) {
                    sIsAllChecked = "F";
                    return false;
                }
            });
        });

        if (sIsAllChecked == "T") {
            EC$('input:checkbox[id="sAgreeAllChecked"]').prop("checked", true);
        }
    }

    /**
     * 모바일 유효성 패턴 체크
     */
    function isValidMobile()
    {
        // 모바일 등록 여부
        if (EC$('#mobile2').length < 1 && EC$('#mobile3').length < 1) {
            return true;
        }

        // 모바일 등록 여부
        if ( SHOP.getLanguage() == 'ko_KR' ) {
            if (EC$('#mobile1').length < 1 && EC$('#mobile2').length < 1 && EC$('#mobile3').length < 1) {
                return true;
            }
        } else {
            if (EC$('#mobile1').length < 1 && EC$('#mobile2').length < 1) {
                return true;
            }
        }

        // 휴대폰 패턴체크
        var aMobile = {};

        if (EC$('#mobile1').length > 0) {
            aMobile.mobile1 = EC$('#mobile1').val();
        }

        if (EC$('#mobile2').length > 0) {
            aMobile.mobile2 = EC$('#mobile2').val();
        }

        if (EC$('#mobile3').length > 0) {
            aMobile.mobile3 = EC$('#mobile3').val();
        }

        if (utilValidatorController.checkMobile(aMobile) === true) {
            return true;
        }

        alert(__('올바른 휴대전화번호를 입력 하세요.'));

        var iElementNumber = utilValidatorController.getElementNumber();

        // focus 처리
        if (iElementNumber == 1) {
            EC$('#mobile1').focus();
        } else if (iElementNumber == 2) {
            EC$('#mobile2').focus();
        } else if (iElementNumber == 3) {
            EC$('#mobile3').focus();
        }
        return false;
    }

    /**
     * 모바일번호 회원가입 유효성 체크
     * @return boolean
     */
    function checkJoinMobile()
    {
        // 회원 가입 휴대전화 필수입력 체크를 기존에 추가로 해 주고 있는 부분 추가
        if (EC$('#is_display_register_mobile').val() == 'T') {
            if (EC_UTIL.trim(EC$('#mobile1').val()) == '' || EC_UTIL.trim(EC$('#mobile2').val()) == '' || (EC$('#mobile3').length > 0 && EC_UTIL.trim(EC$('#mobile3').val()) == '')) {
                alert(__('휴대전화를  입력해주세요.'));
                EC$('#mobile1').focus();
                return false;
            }
        }

        if (memberCommon.isJoinMobileValidPassConditionCheck() === true) {
            return true;
        }

        if (memberCommon.isValidMobile() === true) {
            return true;
        }
        return false;
    }

    /**
     * 모바일번호 유효성 체크
     * @return boolean
     */
    function checkEditMobile()
    {
        // 회원 정보 수정 휴대전화 필수입력 체크를 기존에 추가로 해 주고 있는 부분 추가
        if (EC$('#is_display_register_mobile').val() == 'T') {
            if (EC_UTIL.trim(EC$('#mobile1').val()) == '' || EC_UTIL.trim(EC$('#mobile2').val()) == '') {
                alert(__('올바른 휴대전화번호를 입력하세요.'));
                EC$('#mobile2').focus();
                return false;
            }
        }

        if (memberCommon.isEditMobileValidPassConditionCheck() === true) {
            return true;
        }

        if (memberCommon.isValidMobile() === true) {
            return true;
        }
        return false;
    }

    /**
     * 회원가입 유효성 체크 통과 케이스
     * @returns {boolean}
     */
    function isJoinMobileValidPassConditionCheck()
    {
        // 회원 가입 항목 상세 설정 && 일반전화 항목 등록 설정 후 다시 기본 항목 설정으로 변경시  일반전화 항목 미입력으로 설정으로 복구 되지 않는다.
        // 기존 설정 유지되는 부분이 있어 예외처리
        if (EC$("#useSimpleSignin").length > 0) {
            // 기본 회원가입항목
            if (EC$("#useSimpleSignin").val() == 'T') {
                // 휴대전화 항목 등록 항목 노출 && 휴대전화 필수입력
                if (EC$('#display_register_mobile').val() != "T" || EC$('#display_required_cell').val() != "T") {
                    return true;
                }
            }
        }

        if (SHOP.getLanguage() == 'ko_KR') {
            // 상세항목 회원가입 모바일 필수입력만 체크
            if (EC$('#display_required_cell').val() != "T") {
                return true;
            }
        } else {
            // 해외몰 모바일사용여부 && 필수입력 체크
            if (EC$('#is_display_register_mobile').val() != "T" || EC$('#display_required_cell').val() != "T") {
                return true;
            }
        }
        return false;
    }

    /**
     * 회원정보 수정 유효성 체크 통과 케이스
     * 회원가입과 동일하게 유지
     * @returns {boolean}
     */
    function isEditMobileValidPassConditionCheck()
    {
        if (memberCommon.isJoinMobileValidPassConditionCheck() === true) {
            return true;
        }
        return false;
    }

    /**
     * 일반전화 유효성 체크
     * @return boolean
     */
    function isValidPhone()
    {
        // 일반전화 등록 여부
        if ( SHOP.getLanguage() == 'ko_KR' ) {
            if (EC$('#phone1').length < 1 && EC$('#phone2').length < 1 && EC$('#phone3').length < 1) {
                return true;
            }
        } else {
            if (EC$('#phone1').length < 1 && EC$('#phone2').length < 1) {
                return true;
            }
        }

        // 일반전화 패턴체크
        var aPhone = {};

        if (EC$('#phone1').length > 0) {
            aPhone.phone1 = EC$('#phone1').val();
        }

        if (EC$('#phone2').length > 0) {
            aPhone.phone2 = EC$('#phone2').val();
        }

        if (EC$('#phone3').length > 0) {
            aPhone.phone3 = EC$('#phone3').val();
        }

        if (utilValidatorController.checkPhone(aPhone) === true) {
            return true;
        }

        alert(__('올바른 전화번호를 입력하세요.'));

        var iElementNumber = utilValidatorController.getElementNumber();

        // focus 처리
        if (iElementNumber == 1) {
            EC$('#phone1').focus();
        } else if (iElementNumber == 2) {
            EC$('#phone2').focus();
        } else if (iElementNumber == 3) {
            EC$('#phone3').focus();
        }
        return false;
    }

    /**
     * 일반전화 회원가입 유효성 체크 통과 케이스
     */
    function isJoinPhoneValidPassConditionCheck()
    {
        // 회원 가입 항목 상세 설정 && 일반전화 항목 등록 설정 후 다시 기본 항목 설정으로 변경시  일반전화 항목 미입력으로 설정으로 복구 되지 않는다.
        // 기존 설정 유지되는 부분이 있어 예외처리
        if (EC$("#useSimpleSignin").length > 0) {
            if (EC$("#useSimpleSignin").val() == 'T') {
                return true;
            }
        }

        if (SHOP.getLanguage() == 'ko_KR') {
            // 상세항목 회원가입 일반전화 필수입력만 체크
            if (EC$('#display_required_phone').val() != "T") {
                return true;
            }
        } else {
            // 해외몰 일반전화 사용여부 && 필수입력 체크
            if (EC$('#is_display_register_phone').val() != "T" || EC$('#display_required_phone').val() != "T") {
                return true;
            }
        }
    }

    /**
     * 일반전화 회원정보 수정 유효성 체크 통과 케이스
     */
    function isEditPhoneValidPassConditionCheck()
    {
        if (SHOP.getLanguage() == 'ko_KR') {
            // 상세항목 회원가입 일반전화 필수입력만 체크
            if (EC$('#display_required_phone').val() != "T") {
                return true;
            }
        } else {
            // 해외몰 일반전화 사용여부 && 필수입력 체크
            if (EC$('#is_display_register_phone').val() != "T" || EC$('#display_required_phone').val() != "T") {
                return true;
            }
        }
    }

    /**
     * 일반전화 회원가입 유효성 체크
     * @return boolean
     */
    function checkJoinPhone()
    {
        if (memberCommon.isJoinPhoneValidPassConditionCheck() === true) {
            return true;
        }

        if (memberCommon.isValidPhone() === true) {
            return true;
        }
        return false;
    }

    /**
     * 일반전화 회원정보 수정 유효성 체크
     * @return boolean
     */
    function checkEditPhone()
    {
        if (memberCommon.isEditPhoneValidPassConditionCheck() === true) {
            return true;
        }

        if (memberCommon.isValidPhone() === true) {
            return true;
        }
        return false;
    }

    /**
     * 우편번호 유효성 체크
     */
    function checkZipcode(bCheckKrZipcode)
    {
        var sZipcodeSelector = '#postcode1';
        var sNoZipSelector = '#nozip';

        // 우편번호 필수입력인 경우
        if (EC$('#is_display_register_addr').val() === 'T'
            && (EC$(sNoZipSelector).is(':checked') === false && EC_UTIL.trim(EC$(sZipcodeSelector).val()) === '')) {
            alert(__('우편번호를 입력해주세요.'));
            EC$(sZipcodeSelector).focus();
            return false;
        }

        // 우편번호 포맷 체크
        if ((EC$(sZipcodeSelector).length > 0 && EC$(sZipcodeSelector).val() !== '') && EC$(sNoZipSelector).is(':checked') === false) {
            if (EC$(sZipcodeSelector).val().length < 2 || EC$(sZipcodeSelector).val().length > 14) {
                alert(__("우편번호는 2자 ~ 14자까지 입력가능합니다."));
                EC$(sZipcodeSelector).focus();
                return false;
            }

            if (EC$(sZipcodeSelector).val().match(/^[a-zA-Z0-9- ]{2,14}$/g) == null) {
                alert(__("우편번호는 영문, 숫자, 대시(-)만 입력가능합니다.\n입력내용을 확인해주세요."));
                EC$(sZipcodeSelector).focus();
                return false;
            }
        }

        // 한국 우편번호 자리수 체크
        var sCountryCode = EC$('#country').val();
        if ((typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] === 'T' && sCountryCode === 'KR')
            || (typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] === 'F' && SHOP.getLanguage() == 'ko_KR')
        ) {
            if (EC$(sZipcodeSelector).val() != '' && EC$(sZipcodeSelector).val() != undefined && bCheckKrZipcode == true) {

                var zipcode = EC$(sZipcodeSelector).val();
                zipcode = zipcode.replace('-', '');

                // 숫자가 아니거나 5자리 미만이면 체크
                if (FwValidator.Verify.isNumber(zipcode) == false || zipcode.length < 5 || zipcode.length > 6) {
                    alert('우편번호를 확인해주세요');
                    EC$('#postcode2').val('');
                    EC$(sZipcodeSelector).focus();
                    return false;
                }
            }
        }
    }

    /**
     * 영문몰 국가 미국, 캐나다 선택 시 주/도 select box 설정
     */
    function setUsStateNameVisible() {
        if ( SHOP.getLanguage() !== 'en_US' ) {
            return;
        }

        try {
            var sCountry = EC$('#country').val();
            // 국가코드가 2자리일 경우 3자리로 변환
            if (sCountry.length === 2) {
                sCountry = EC_ADDR_COMMONFORMAT_FRONT.convertCountryDomainToCode(sCountry);
            }

            var sStateName = EC$('#__state_name').val();
            var sStateNameElement = EC$('#state_name');
            var sStateListCaElement = EC$('#stateListCa');
            var sStateListUsElement = EC$('#stateListUs');

            if (sCountry === 'USA') {
                sStateNameElement.prop('disabled', true);
                sStateNameElement.hide();
                sStateListCaElement.prop('disabled', true);
                sStateListCaElement.hide();
                sStateListUsElement.prop('disabled', false);
                sStateListUsElement.show();
                sStateListUsElement.val(sStateName).prop('selected', true);
            } else if (sCountry === 'CAN') {
                sStateNameElement.prop('disabled', true);
                sStateNameElement.hide();
                sStateListUsElement.prop('disabled', true);
                sStateListUsElement.hide();
                sStateListCaElement.prop('disabled', false);
                sStateListCaElement.show();
                sStateListCaElement.val(sStateName).prop('selected', true);
            } else {
                sStateListUsElement.prop('disabled', true);
                sStateListUsElement.hide();
                sStateListCaElement.prop('disabled', true);
                sStateListCaElement.hide();
                sStateNameElement.prop('disabled', false);
                sStateNameElement.show();
            }
        } catch(e) {}
    }

    /**
     * 미국 주/도 선택 값 설정
     */
    function setCountryUsStateNameValue() {
        var sCountryCode = EC$('#country').val();
        // 국가코드가 2자리일 경우 3자리로 변환
        if (sCountryCode.length === 2) {
            sCountryCode = EC_ADDR_COMMONFORMAT_FRONT.convertCountryDomainToCode(sCountryCode);
        }

        if (sCountryCode !== 'USA') {
            return;
        }

        try {
            var sStateName = EC$('#stateListUs').val();
            EC$('#__state_name').val(sStateName);
        } catch(e) {}
    }

    /**
     * 캐나다 주/도 선택 값 설정
     */
    function setCountryCaStateNameValue() {
        var sCountryCode = EC$('#country').val();
        // 국가코드가 2자리일 경우 3자리로 변환
        if (sCountryCode.length === 2) {
            sCountryCode = EC_ADDR_COMMONFORMAT_FRONT.convertCountryDomainToCode(sCountryCode);
        }

        if (sCountryCode !== 'CAN') {
            return;
        }

        try {
            var sStateName = EC$('#stateListCa').val();
            EC$('#__state_name').val(sStateName);
        } catch(e) {}
    }

    /**
     * 영문몰 state_name 유효성 체크
     * @returns {boolean}
     */
    function checkUsStatename()
    {
        if ((typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] === 'T') || SHOP.getLanguage() != 'en_US') {
            return true;
        }

        if (EC$('#display_required_address').val() != 'T') {
            return true;
        }

        try {
            var sCountry = EC$('#country').val();
            var bIsEmptyStatenameValue = true;
            var sStateNameId = 'state_name';

            if (sCountry == 'USA') {
                sStateNameId = 'stateListUs';
            } else if (sCountry == 'CAN') {
                sStateNameId = 'stateListCa';
            }

            if (EC$('#' + sStateNameId).val() == '') {
                EC$('#' + sStateNameId).focus();
                bIsEmptyStatenameValue = false;

                if (sStateNameId == "state_name") {
                    alert(sprintf(__('IS.REQUIRED.FIELD', 'MEMBER.RESOURCE.JS.COMMON'), EC$('#' + sStateNameId).attr('fw-label')));
                } else {
                    alert(__('SELECT.STATE.PROVINCE', 'MEMBER.RESOURCE.JS.COMMON'));
                }
            }

            return bIsEmptyStatenameValue;
        } catch(e) {}

        return true;
    }

    /**
     * 국가 변경시 휴대전화, 일반전화 국가 코드 변경
     */
    function setSelectedPhoneCountryCode()
    {
        if (typeof(oCountryVars) != "object") {
            return;
        }

        if (EC$('#country').length < 1) {
            return;
        }

        var sCode = EC$('#country').val();
        // 국가코드가 2자리일 경우 3자리로 변환
        if (sCode.length === 2) {
            sCode = EC_ADDR_COMMONFORMAT_FRONT.convertCountryDomainToCode(sCode);
        }
        var sDialingCode = parseInt(oCountryVars[sCode].d_code, 10);
        var sCountryName = oCountryVars[sCode].country_name_en;
        var aMultiplCode = [1, 7, 262];
        var oFilter = eval("/" + sCountryName + "/ig");

        // 나라별 국번이 동일하면
        if (EC$.inArray(sDialingCode, aMultiplCode) >= 0) {
            if (EC$("#mobile1").length > 0) {
                EC$("#mobile1>option").each(function() {
                    if (oFilter.test(EC$(this).text()) == true) {
                        EC$(this).prop("selected", true);
                    }
                });
            }
            if (EC$("#phone1").length > 0) {
                EC$("#phone1>option").each(function() {
                    if (oFilter.test(EC$(this).text()) == true) {
                        EC$(this).prop("selected", true);
                    }
                });
            }
        } else {
            if (EC$("#mobile1").length > 0) { EC$("#mobile1").val(sDialingCode); }
            if (EC$("#phone1").length > 0) { EC$("#phone1").val(sDialingCode); }
        }

    }

    /**
     * 국가 변경시 실행 필요한 설정
     */
    function setChangeCountry()
    {
        setFindZipcode();

        try {
            // 일문 주소 readonly 설정
            zipcodeCommonController.setJapanCountryAddr1(EC$(this).val(), EC$('#addr1'), EC$('#postcode1'));
        } catch (e) {
        }

        try {
            if (isCountryOfLanguage == 'T') {
                setAddressOfLanguage.changeCountry();
            }
        } catch (e) {}
        this.setUsStateNameVisible();
        this.setSelectedPhoneCountryCode();
    }

    /**
     * 메일 입력 폼 기존 하드코딩 되어 있을 경우 동작
     */
    function bindEmail()
    {
        if (EC$('#email3').length < 1) {
            return;
        }

        if (EC$('#email2').length < 1) {
            return;
        }

        EC$('#email3').on('change', function() {

            var host = this.value;

            if (host != 'etc' && host != '') {
                EC$('#email2').prop('readonly', true);
                EC$('#email2').val(host).change();
            } else if (host == 'etc') {
                EC$('#email2').prop('readonly', false);
                EC$('#email2').val('').change();
                EC$('#email2').focus();
            } else {
                EC$('#email2').prop('readonly', true);
                EC$('#email2').val('').change();
            }

        });
    }

    /**
     * <a href="url" oncolick="memberCommon.agreementPopup(this)"/>
     * url 정보를 읽어 팝업을 띄운다
     */
    function agreementPopup(oALinkObject)
    {
        var sPopupUrl = oALinkObject.href;
        if (EC_MOBILE_DEVICE == true) {
            window.open(sPopupUrl);
        } else {
            window.open(sPopupUrl, '', 'width=450,height=350');
        }
    }

    /**
     * 룰셋 기반 UI에서 주소 데이터 셋팅 (수정 페이지)
     */
    function setAddrDataOfRuleBase()
    {
        if (typeof common_aAddrInfo === 'undefined' || common_aAddrInfo['sIsRuleBasedAddrForm'] !== 'T') {
            return;
        }

        var sPageType = 'fmodify';
        var sCountryCode = EC$('#country').val();
        if (common_aAddrInfo.aAllCountryFormat[sCountryCode] === undefined) {
            sCountryCode = 'DEFAULT';
        }

        setAreaAddr(sPageType, sCountryCode);
        setZipcodeConfig(sPageType, sCountryCode);
    }

    /**
     * Select 항목에 대해서 저장된 값을 selected 합니다.
     * 1) State 리스트의 값 설정 (미국, 캐나다)
     * 2) Selectbox로 주소 검색하는 국가(중국, 대만, 베트남, 필리핀)에 대해서 리스트의 값 설정
     * @param sPageType
     * @param sCountryCode
     */
    function setAreaAddr(sPageType, sCountryCode)
    {
        var aAreaHiddenData = [];
        aAreaHiddenData['sStateName'] = EC$("#__state_name").val();
        aAreaHiddenData['sCityName'] = EC$("#__city_name").val();
        aAreaHiddenData['sStreetName'] = EC$("#__addr1").val();

        // Area가 아니면서 state를 Selectbox로 제공하는 경우 (ex : 미국, 캐나다)
        var aIsAreaAddr = EC_ADDR_COMMONFORMAT_FRONT.getConfigIsAreaAddr(sPageType);
        if (aIsAreaAddr.sIsAreaAddr === 'F'
            && (typeof common_aAddrInfo.aAllCountryFormat[sCountryCode].select !== 'undefined'
            && common_aAddrInfo.aAllCountryFormat[sCountryCode].select.indexOf('state') > 0)) {
            EC_ADDR_COMMONFORMAT_FRONT.setStateSelected(sCountryCode, sPageType, aAreaHiddenData['sStateName']);
        } else { // Area인 경우 (ex : 중국, 대만, 베트남 ... )
            EC_ADDR_COMMONFORMAT_FRONT.setAreaAddrSelected(sCountryCode, sPageType, aAreaHiddenData);
        }
    }

    /**
     * 해당 국가 포맷에 disabled, checked가 정의되어 있고 우편번호가 저장되어 있다면,
     * 우편번호 inputbox의 disabled와 checkbox의 checked를 해제
     * @param sPageType
     * @param sCountryCode
     */
    function setZipcodeConfig(sPageType, sCountryCode)
    {
        var bIsExistZipcodeVal = !!EC$('#postcode1').val();

        // 포맷에 disabled, checked 존재여부 확인
        var isHasDisabled = common_aAddrInfo.aAllCountryFormat[sCountryCode].hasOwnProperty("disabled");
        var isHasChecked = common_aAddrInfo.aAllCountryFormat[sCountryCode].hasOwnProperty("checked");
        if (isHasDisabled === false || isHasChecked === false) {
            return false;
        }

        // zipcode inputbox와 checkbox 존재여부 확인
        if (common_aAddrInfo.aAllCountryFormat[sCountryCode].checked.indexOf('zipcodeCheck') < 0
            || common_aAddrInfo.aAllCountryFormat[sCountryCode].disabled.indexOf('zipcode') < 0
            || bIsExistZipcodeVal === false) {
            return false;
        }

        EC_ADDR_COMMONFORMAT_FRONT.unblockedZipcodeField(sPageType);
    }

    /*
     * 선택항목 약관 체크
     */
    function optionalCheck()
    {
        // 개인정보 수집 및 이용 동의(선택)
        if (EC$('#display_agree_privacy_optional_check_flag').val() != "T") {
            return true;
        }


        if (EC$('input[name="agree_privacy_optional_check[]"]').is(":checkbox") === true) {
            if (EC$("input[name='agree_privacy_optional_check[]']").is(":checked") === true) {
                return true;
            }
        } else if (EC$('input[name="agree_privacy_optional_check[]"]').length > 0) {
            if (EC$("input[name='agree_privacy_optional_check[]']").val() == "T") {
                return true;
            }
        }

        var isConfirm = true;
        EC$.each(registerOptionalList, function(sKey1, sValue1) {
            // 존재하는지 확인
            if (EC$("#"+sValue1.sDomId).length < 1) {
                return true;
            }

            // 회원 정보 입력 항목 필수 상태 값으로 처리
            if (sValue1.hasOwnProperty('is_required') === true) {
                // 필수 항목 제외
                if (sValue1.is_required == "T") {
                    return true;
                }
            }

            // 필수처리 dom 존재 확인
            if (EC$("#"+sValue1.is_required_dom).length > 0) {
                // 필수 항목 제외
                if (EC$("#"+sValue1.is_required_dom).val() == "T") {
                    return true;
                }
            }

            // data 등록 했는지 확인
            if (Array.isArray(sValue1.sDomId) === true) {
                EC$.each(sValue1.sDomId, function (sKey2, sValue2) {
                    if (memberCommon.issetOptionalElementValue(sValue2, sValue1.default_value) === false) {
                        isConfirm = false;
                        return false;
                    }
                });
            } else {
                if (memberCommon.issetOptionalElementValue(sValue1.sDomId, sValue1.default_value) === false) {
                    isConfirm = false;
                    return false;
                }
            }
        });

        if (isConfirm === false) {
            if (confirm(__('DO.NOT.AGREE.TERMS', 'MEMBER.RESOURCE.JS.COMMON')) === true) {
                return true;
            } else {
                return false;
            }
        }
        return true;
    }

    /**
     * 객체 type 확인 후 값 확인
     * @param sSelector dom
     * @param sDefaultValue 기본 값
     * @returns {boolean} 결과
     */
    function issetOptionalElementValue(sSelector, sDefaultValue)
    {
        if (sSelector.length < 1) {
            return true;
        }

        if (EC$("#"+sSelector).is(":radio") === true || EC$("#"+sSelector).is(":checkbox") === true) {
            if (EC$("#"+sSelector).is(":checked") === true) {
                if (EC$("#"+sSelector).val() == sDefaultValue) {
                    return true;
                }
                return false;
            }
        }

        if (EC$("#"+sSelector).val() != "") {
            if (EC$("#"+sSelector).val() == sDefaultValue) {
                return true;
            }
            return false;
        }

    }

    return {
        oAgreeCheckbox: oAgreeCheckbox,
        oMarketingAgreeCheckbox: oMarketingAgreeCheckbox,
        oMarketingAgreeAllChecked: oMarketingAgreeAllChecked,
        agreeAllChecked: agreeAllChecked,
        marketingAgreeAllCheckboxIsChecked: marketingAgreeAllCheckboxIsChecked,
        marketingAllChecked: marketingAllChecked,
        agreeAllUnChecked: agreeAllUnChecked,
        marketingRemoveFilter: marketingRemoveFilter,
        eachCheckboxAgreeAllChecked: eachCheckboxAgreeAllChecked,
        checkJoinMobile: checkJoinMobile,
        checkEditMobile: checkEditMobile,
        isJoinMobileValidPassConditionCheck: isJoinMobileValidPassConditionCheck,
        isEditMobileValidPassConditionCheck: isEditMobileValidPassConditionCheck,
        isJoinPhoneValidPassConditionCheck: isJoinPhoneValidPassConditionCheck,
        isEditPhoneValidPassConditionCheck: isEditPhoneValidPassConditionCheck,
        checkJoinPhone: checkJoinPhone,
        checkEditPhone: checkEditPhone,
        isValidPhone: isValidPhone,
        isValidMobile: isValidMobile,
        setUsStateNameVisible: setUsStateNameVisible,
        setCountryUsStateNameValue: setCountryUsStateNameValue,
        setCountryCaStateNameValue: setCountryCaStateNameValue,
        checkUsStatename: checkUsStatename,
        setChangeCountry: setChangeCountry,
        setSelectedPhoneCountryCode: setSelectedPhoneCountryCode,
        bindEmail: bindEmail,
        agreementPopup: agreementPopup,
        optionalCheck: optionalCheck,
        issetOptionalElementValue: issetOptionalElementValue,
        setAddrDataOfRuleBase: setAddrDataOfRuleBase,
        checkZipcode: checkZipcode
    };
})();


// 이메일 중복 체크 여부
var bCheckedEmailDupl = false;
// 아이디 중복체크 공통 url
var sIdDuplicateCheckUrl = '';

EC$(function(){

    // Moment 스크립트 초기화
    EC_GLOBAL_DATETIME.init(function () {});

    EC$('[onclick^="findAddress"]').prop('onclick', null).off('click');
    EC$('[onclick^="findAddress"]').on('click', {
            'zipId1' : 'postcode1',
            'zipId2' : 'postcode2',
            'addrId' : 'addr1',
            'cityId' : '',
            'stateId' : '',
            'type' : 'mobile',
            'sLanguage' : SHOP.getLanguage(),
            'addrId2' : ''
        }, ZipcodeFinder.Opener.Event.onClickBtnPopup);
    
    // 회원가입 설정 항목 필수 아이콘 숨김 처리 - ECHOSTING-115627
    EC$(':hidden[name^="display_required_"]').each(function (i) {
        bDisplayFlag = (EC$(this).val() == 'T') ? true : false;
        sExtractId = EC$(this).attr('id').substr(17);

        if (sExtractId == 'bank_account_no') { // 환불계좌 쪽은 id값이 매칭이 되지 않아 예외 처리
            sDisplayTargetId = 'icon_is_display_bank';
        } else if (sExtractId == 'name_phonetic') { // 이름 발음 쪽은 id값이 매칭이 되지 않아 예외 처리
            sDisplayTargetId = 'icon_phonetic';
        } else {
            sDisplayTargetId = 'icon_' + sExtractId;
        }

        // 한국어 몰은 이름 항목은 무조건 '필수' 
        if (SHOP.getLanguage() == 'ko_KR' && sDisplayTargetId == 'icon_name') {
            bDisplayFlag = true;
        }

        if (bDisplayFlag == false) {
            EC$('#' + sDisplayTargetId).hide();
        } else {
            EC$('#' + sDisplayTargetId).show();
        }
    });

    if (typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] !== 'T') {
        EC$('#nozip').on('change', function () {
            if (EC$(this).is(':checked') == true) {

                EC$('#postcode1').prop("disabled", true);
                //주소정보 초기화
                EC$('#postcode1').val("");
                EC$('#addr1').focus();
                if (SHOP.getLanguage() == 'en_US') {
                    return;
                }

                //우편번호 백업
                EC$('#postcode1').attr('backup_postcode', EC$('#postcode1').val());

                //주소정보 초기화
                EC$('#postcode2, #addr1, #city_name, #state_name, #__addr1, #__city_name, #__state_name').val("");
                if (SHOP.getLanguage() != 'vi_VN') {
                    EC$('#addr2').val("");
                }

                //우편번호 버튼 비활성
                EC$('#postcode1, #addr1').removeAttr("readonly").val('');

                EC$('#postBtn').prop('onclick', null).off('click').css('cursor', 'unset');
                EC$('#SearchAddress').attr('src', EC$('#SearchAddress').attr('off'));
            } else {
                EC$('#postcode1').removeAttr("disabled");
                //주소정보 초기화
                EC$('#postcode1').val("");
                if (SHOP.getLanguage() == 'en_US') {
                    return;
                }

                //우편번호 버튼 활성화
                EC$('#postcode2, #addr1').val('');

                EC$('#postBtn').on('click', {
                    'zipId1' : 'postcode1',
                    'zipId2' : 'postcode2',
                    'addrId' : 'addr1',
                    'cityId' : 'city_name',
                    'stateId' : 'state_name',
                    'type' : 'layer',
                    'sLanguage' : SHOP.getLanguage(),
                    'addrId2' : 'addr2'
                }, ZipcodeFinder.Opener.Event.onClickBtnPopup);
                EC$('#postBtn').css('cursor','pointer');
                EC$('#SearchAddress').attr('src', EC$('#SearchAddress').attr('on'));
                setFindZipcode();
            }
        });
    }

    EC$('#direct_input_postcode1_addr0').on('change', function(){
        var oPostBtn = EC$("#postBtn");
        var oPostcode1 = EC$("#postcode1");
        var oAddr1 = EC$("#addr1");
        oPostcode1.val('');
        oAddr1.val('');
        if (EC$(this).is(':checked') == true) {
            oPostBtn.hide();
            oPostcode1.prop('readonly', false);
            oAddr1.prop('readonly', false);
        } else {
            oPostBtn.show();
            oPostcode1.prop('readonly', true);
            oAddr1.prop('readonly', true);
        }
    });
    try {
        if (mobileWeb == true && EC$('#mobilemailduplecheckbutton').length > 0) {
            if (EC$("#useCheckEmailDuplication").val() == "T") {
                EC$('#mobilemailduplecheckbutton').css('display', '');
            }
            else {
                EC$('#mobilemailduplecheckbutton').css('display', 'none');
            }
        }
    } catch (e) {}


    // 닉네임 체크
    EC$('#nick_name').on('blur', function(){
        checkNick();
    });

    // 이메일 중복 체크
    EC$('#etc_subparam_email1').on('change', function() {

        // 국내몰일 경우 이메일 중복 체크 기능을 사용하는 경우에만 호출.
        if ( SHOP.getLanguage() == 'ko_KR' ) {
            if ( EC$("#useCheckEmailDuplication").val() == "T") { setDuplEmail(); }
        }
        // 해외 몰일경우 그냥 호출.
        else {
            setDuplEmail();
        }

    });
    
    if (SHOP.getLanguage() == 'ko_KR') {
        EC$('#email2').on('change', function() {
            if (EC$("#useCheckEmailDuplication").val() == "T") {
                setDuplEmail();
            }
        });
    }

    // 이메일 중복 및 유효성 체크
    EC$('#email1').on('change', function() {
        // [ECHOSTING-382207] [컨버스코리아_자사몰] 국문몰도 이메일 로그인 회원가입 기능개선
        setDuplEmail();
    });

    // 이메일 중복 및 유효성 체크
    function setDuplEmail() {
        // 이메일 유효성 체크
        getValidateEmail();

        // 이메일 중복 체크
        // 외국어몰일경우 이메일 중복체크가 필수인데 이메일 중복 체크 사용값이 F인 경우가 있음. ex) 주문서 간단회원가입
        if (EC$("#useCheckEmailDuplication").val() == "T" || EC$('#is_email_auth_use').val() == 'T' || EC$('#login_id_type').val() === 'email' || SHOP.getLanguage() !== 'ko_KR') {
            checkDuplEmail();
        }
    }

    // 이메일 유효성 체크
    function getValidateEmail() {
        // 회원 가입 메일 발송 버튼 초기화 (EC VN 기능 - ECHOSTING-393281)
        if (EC$("#send_mail_activation_btn").length > 0) {
            EC$('#send_mail_activation_btn').remove();
        }

        EC$('#emailMsg').removeClass('error').html('');

        if (EC$('#email2').length > 0) {
            var sEmail = EC$('#email1').val() + '@' + EC$('#email2').val();
        } else {
            var sEmail = EC$('#email1').val();
        }

        if (EC$('#email1').val() != undefined) {

            if (EC$('#email1').val().length == 0) {
                EC$('#emailMsg').addClass('error').html(__('이메일을 입력해 주세요.'));
                return false;
            } else {
                if (FwValidator.Verify.isEmail(sEmail) == false || sEmail.length > 255) {
                    EC$('#emailMsg').addClass('error').html(__('유효한 이메일을 입력해 주세요.'));
                    return false;
                }
            }
        }

        if ( EC$('#etc_subparam_email1').val() != undefined && SHOP.getLanguage() != 'ko_KR') {

            var sEmail = EC$('#etc_subparam_email1').val();

            if (EC$('#etc_subparam_email1').val().length == 0 ) {
                EC$('#emailMsg').addClass('error').html(__('이메일을 입력해 주세요.'));
                return false;
            } else {
                if (FwValidator.Verify.isEmail(sEmail) == false || sEmail.length > 255) {
                    EC$('#emailMsg').addClass('error').html(__('유효한 이메일을 입력해 주세요.'));
                    return false;
                }
            }
        }
    }

    if (SHOP.getLanguage() != 'ko_KR' && EC$('#idMsg').length > 0) {
        EC$('#idMsg').html(__('아이디는 영문소문자 또는 숫자 4~16자로 입력해 주세요.'));
    }

    if (EC$('#emailMsg').length > 0) {
        if (EC$('#login_id_type').val() == 'email') {
            EC$('#emailMsg').html(__('로그인 아이디로 사용할 이메일을 입력해 주세요.'));
        }
    }

    // 아이디 중복 체크
    EC$('#joinForm').find('#member_id').on('blur', function(){
        //if ( SHOP.getLanguage() == 'ko_KR' ) return;
        if (mobileWeb) return;
        checkDuplId();
    });

    // 아이디 중복 체크
    EC$('#etc_subparam_member_id').on('blur', function(){
        //if ( SHOP.getLanguage() == 'ko_KR' ) return;
        if ( mobileWeb ) return;
        checkDuplId();
    });

    // 비밀번호 확인 체크
    EC$('#user_passwd_confirm').on('blur', function() {
        if (EC$('#pwConfirmMsg').length < 1) return;
        if (EC$('#user_passwd_confirm').val() == '' && EC$('#passwd').val() == '') return;
        checkPwConfirm('user_passwd_confirm');
    });

    // 비밀번호 확인 체크
    EC$('#etc_subparam_user_passwd_confirm').on('blur', function(){
        if ( EC$('#pwConfirmMsg').length < 1 ) return;
        if ( EC$('#etc_subparam_user_passwd_confirm').val() == '' && EC$('#etc_subparam_passwd').val() == '') return;
        checkPwConfirm('etc_subparam_user_passwd_confirm');
    });

    EC$('#cssn').on('blur', function(){
        if (EC$('#cssn').val() == '') return;

        if (EC$('#use_checking_cssn_duplication').val() == 'F') {
            checkCssnValid(EC$('#cssn').val());
        }
    });

    EC$('#cssn').on('change', function() {
        if (EC$('#use_checking_cssn_duplication').val() == 'T') {
            EC$('#cssnDuplCheck').val('F');
        }
    });

    // 국가선택시
    EC$('#country').on('change', function(){
        try {
            memberCommon.setChangeCountry();
        } catch(e) {}
    });

    //주소입력시 입력값 동기화
    EC$('#addr1, #city_name, #state_name').on('change', function() {
        EC$('#__'+EC$(this).attr('id')).val(EC$(this).val());
    });

    EC$('#stateListUs').on('change', function() {
        memberCommon.setCountryUsStateNameValue();
    });

    EC$('#stateListCa').on('change', function() {
        memberCommon.setCountryCaStateNameValue();
    });

    EC$('#bank_account_no').keyup(function(){
        filterBankAccountNo(EC$(this));
    });

    EC$('#bank_account_no').blur(function(){
        filterBankAccountNo(EC$(this));
    });

    try {
        memberCommon.bindEmail();
    } catch(e) {}

    function filterBankAccountNo(oObj)
    {
        var iLimit = 50;
        var value = oObj.val();
        if (/^[\-0-9]+$/.test(value) == false) {

            value = value.replace(/[^0-9\-]/g, '');
            value = value.substr(0, 1) + value.substr(1).replace(/[^\-0-9]/g, '');

            if (value.length > iLimit) {
                value = value.substr(0, iLimit);
            }

            oObj.val(value);
        } else {
            if (value.length > iLimit) {
                value = value.substr(0, iLimit);
                oObj.val(value);
            }
        }
    }

    //ECHOSTING-16798 새로 추가된 모바일 인증 HTML 없을경우 기존 회원인증 로직 숨김 처리
    if (mobileWeb) {
        if (EC$('#member_name_cert_flag').val() == 'T'
            && EC$('#is_mobile_auth_use').val() == 'T'
            && EC$('#realNameEncrypt').val() == '') {
            if (!EC$("#authMember").get(0)) {
                if (EC$("#is_ipin_auth_use").val() == "F") {
                    EC$("#auth_tr").empty();
                    EC$("#ipin_tr").css('display', 'none');
                    EC$("#name_tr").css('display', 'table-row');
                    EC$("#name_tr").find("td").empty().append('<input id="name" name="name" fw-filter="isFill&amp;isMax[20]" fw-label="이름" fw-msg="" class="inputTypeText" maxlength="20" value="" type="text" autocomplete="off">');
                } else if (EC$("#is_ipin_auth_use").val() == "T") {
                    //아이핀 인증 사용중이면서 디자인가이드가 추가 안되었을 때 휴대폰 인증 삭제 처리
                    EC$("#auth_tr").find("input[value='m']").next().remove().end().remove();
                }
                
            }
            
        }
        
    }
    
    //  회원가입 페이지 내디폴트 인증수단
    if (EC$("#default_auth_reg_page_flag").get(0)) {

        // 아이핀, 휴대폰 인증 둘다 존재할때
        if (EC$("#ipinWrap").get(0) && EC$("#mobileWrap").get(0)) {

            var sDefaultAuth = EC$("#default_auth_reg_page_flag").val();
            EC$("input[name='personal_type']").prop("checked", false);

            if (sDefaultAuth == "I") {
                EC$("input[name='personal_type'][value='i']").prop("checked", true);
            }

            if (sDefaultAuth == "H") {
                EC$("input[name='personal_type'][value='m']").prop("checked", true);

                EC$('#ipinWrap').hide();
                EC$('#mobileWrap').show();
                EC$('#emailWrap').hide();
            }

            // 둘다 없을때는 디폴트
            if (EC$("input[name='personal_type']:checked").length <= 0) {
                EC$("input[name='personal_type'][value='i']").prop("checked", true);
            }

            // 기본설정이 아이핀이고, 아이핀설정을 사용하지않을경우 모바일 셋팅으로
            if (EC$("#is_ipin_auth_use").val() == "F" && sDefaultAuth == "I") {
                EC$("input[name='personal_type'][value='m']").prop("checked", true);

                EC$('#ipinWrap').hide();
                EC$('#mobileWrap').show();
                EC$('#emailWrap').hide();
            }
            // ECHOSTING-89438 이메일 인증 디폴트 처리
            if (sDefaultAuth == "E") {
                EC$("input[name='personal_type'][value='e']").prop("checked", true);

                EC$('#ipinWrap').hide();
                EC$('#mobileWrap').hide();
                EC$('#emailWrap').show();
            }
        }
    }

    if (SHOP.getLanguage() != 'ko_KR') {
        try {
            setAddressOfLanguage.joinInit();
        } catch (e) {}

        try {
            memberCommon.setChangeCountry();
        } catch (e) {}
    }

    // ECHOSTING-89438 외국인 이름 설정
    EC$('#foreigner_name').on('blur', function(){
        if (EC$('input[name=foreigner_type]:checked').val() == 'e') {
            EC$('#nameContents').html(EC$('#foreigner_name').val());
        }
    });

    /**
     * ECHOSTING-349292 대응
     * 중/대/일/베트남 우편 번호 검색 폼 대응 이벤트 바인딩
     * 주문서 페이지에서 memberJoin.js / addr.js 의 바인딩이 2중으로 존재하여 이벤트가 2회 발생하므로,
     * 해당 두 파일에서는 주문서 페이지 일경우 바인딩 하지 않도록 예외처리하고, 주문서 페이지 용으로 이벤트 바인딩 별도 추가
     */
    if (typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] !== 'T') {
        EC$('#si_name_addr').on('change', function () {
            setAddressOfLanguage.setZipcode(this);
            setAddressOfLanguage.setLastZipcode();
        });
        EC$('#ci_name_addr').on('change', function () {
            setAddressOfLanguage.setZipcode(this);
            setAddressOfLanguage.setLastZipcode();
        });
        EC$('#gu_name_addr').on('change', function () {
            setAddressOfLanguage.setZipcode('last');
            setAddressOfLanguage.setLastZipcode();
        });
    }
    try {
        setAddressCommon.setUseCountryNumberModifyUi(EC$('#phone1'), EC$('#mobile1'));
    } catch(e) {}

    // 약관 동의 관련 함수들
    try {
        // sms, email 수신동의 필수 입력 제거
        memberCommon.marketingRemoveFilter();

        // 약관 전체 동의 체크
        EC$('input:checkbox[id="sAgreeAllChecked"]').on('change', function () {
            memberCommon.agreeAllChecked();
        });

        // 모바일 마케팅 영역 약관 전체 체크
        EC$('input:checkbox[id="sMarketingAgreeAllChecked"]').on('change', function () {
            memberCommon.marketingAllChecked();
        });

        // 모바일 마케팅 영역 each 체크
        EC$.each(memberCommon.oMarketingAgreeCheckbox, function (i, oVal) {
            if (oVal.length < 1) {
                // continue
                return true;
            }
            oVal.obj.on('change', function () {
                memberCommon.marketingAgreeAllCheckboxIsChecked();
            });
        });

        // 전체 약관 each 체크
        EC$.each(EC$('.agreeArea'), function (i, oVal) {
            if ((EC$(oVal).hasClass('displaynone')) === true) {
                return true;
            }

            EC$.each(EC$(oVal).find("input:checkbox"), function (j, oVal2) {
                EC$(oVal2).on('change', function () {
                    memberCommon.eachCheckboxAgreeAllChecked();
                });
            });
        });

        // each 전체 동의 체크 언체크
        EC$.each(memberCommon.oAgreeCheckbox, function (i, oVal) {
            if (oVal.obj.length < 1) {
                // continue
                return true;
            }

            oVal.obj.on('change', function () {
                sIsUnchecked = memberCommon.agreeAllUnChecked(oVal.obj);
                if (sIsUnchecked == "T") {
                    return false;
                }
            });
        });
    } catch(e) {}
});


var globalJoinData = [];
var essn_array = null;
var check_nick_name_essn = false;
var iRerun = 0;

// 해당국가 외에는 직접 우편번호를 넣는다.
function setFindZipcode()
{
    if (typeof common_aAddrInfo === 'object' && common_aAddrInfo['sIsRuleBasedAddrForm'] === 'T') {
        return;
    }

    var sCountry = EC$('#country').val();
    var sLanguage = SHOP.getLanguage();

    //주소정보 초기화
    EC$('#postcode1, #postcode2, #addr1, #city_name, #state_name, #__addr1, #__city_name, #__state_name').val("");
    
    if (SHOP.getLanguage() != 'vi_VN') {
        EC$('#addr2').val("");
    }

    //우편번호 복원
    EC$('#postcode1').val(EC$('#postcode1').attr('backup_postcode'));

    //멀티샵언어와 국가정보가 일치하는지 체크
    if ( ( sLanguage == 'zh_CN' && ( sCountry != 'CHN' && sCountry != 'TWN') ) ||
        ( sLanguage == 'ja_JP' && sCountry != 'JPN') ||
        ( sLanguage == 'zh_TW' && sCountry != 'TWN') ) {

        EC$('#SearchAddress').hide();
        if (mobileWeb == true) {
            EC$('#postBtn').hide();
        }

    } else {
        if ( sLanguage != 'en_US' && sLanguage != 'es_ES' && sLanguage != 'pt_PT') {
            if (EC$('#nozip').prop('checked') == true) {
                EC$('#nozip').prop('checked', false).change();
                EC$('#nozip').prop('checked', false);
            }

            EC$('#SearchAddress').show();
            if (mobileWeb == true) {
                EC$('#postBtn').show();
            }
            EC$('tr:has(td:has(#city_name)), tr:has(td:has(#state_name))').hide();
        }
    }
}

/**
 * 회원가입하기 개인정보 이용약관 체크박스 확인 후 회원가입페이지로 이동
 * @returns void
 */
function checkAgreement( sUrl )
{
    var checkAgree = [];
    EC$("input[type='checkbox']").each(function(){
        var attrName = EC$(this).attr('name');
        var bAgree = /agree_service_check/ig.test( attrName );
        var bPerson = /agree_privacy_check/ig.test( attrName );
        var bPerson = /agree_privacy_check/ig.test( attrName );
        if ( bAgree ) {
            if ( EC$(this).prop("checked")  ) {
                checkAgree[0] = "";
            } else {
                checkAgree[0] = EC$(this).attr("fw-msg");
            }
        }
        if ( bPerson )  {
            if ( EC$(this).prop("checked")  ) {
                checkAgree[1] = "";
            } else {
                checkAgree[1] = EC$(this).attr("fw-msg");
            }
        }
    });
    if ( checkAgree[0] != "" ) {
        alert( checkAgree[0] );
        return false;
    }
    if ( checkAgree[1] != "" ) {
        alert( checkAgree[1] );
        return false;
    }

    /**
     * 모바일 회원가입일때 3자 정보제공동의 값을 회원가입폼으로 전달하기 위해 처리 by sskim02
     * @returns void
     */
    var isSubmit = "F";
    var sHidden = "";
    var $agree_information = EC$("input:checkbox[name='agree_information_check[]']");
    var $agree_consignment = EC$("input:checkbox[name='agree_consignment_check[]']");
    if (($agree_information.length > 0 && $agree_information[0].checked) || ($agree_consignment.length > 0 && $agree_consignment[0].checked)) {
        sHidden = '<input type="hidden" name="agree_information" value="'+($agree_information[0].checked ? '1':'') +'"/><input type="hidden" name="agree_consignment" value="'+($agree_consignment[0].checked ? '1' : '')+'"/>';
        isSubmit = "T";
    }

    var $agree_privacy_optional = EC$("input:checkbox[name='agree_privacy_optional_check[]']");
    if ($agree_privacy_optional.length > 0 && $agree_privacy_optional[0].checked) {
        sHidden += '<input type="hidden" name="agree_privacy_optional_check" value="'+($agree_privacy_optional[0].checked ? 'T':'') +'"/>';
        isSubmit = "T";
    }

    var oMarketingCheckbox = [
        {obj: EC$('input:checkbox[name="is_sms"]'), hiddenName: "is_sms_check"}, // sms 수신 동의
        {obj: EC$('input:checkbox[name="is_news_mail"]'), hiddenName: "is_news_mail_check"} // 이메일 수신 동의
    ];

    EC$.each(oMarketingCheckbox, function(i, oVal) {
        if (oVal.obj.length < 1) {
            // continue
            return true;
        }

        isSubmit = "T";
        if (oVal.obj.is(":checked") === true) {
            sHidden += '<input type="hidden" name="'+oVal.hiddenName+'" value="T" />';
        } else {
            sHidden += '<input type="hidden" name="'+oVal.hiddenName+'" value="F" />';
        }
    });


    if (isSubmit == "T") {
        EC$(document.body).append('<form id="formAgreement" method="post" action="' + sUrl + '">'+sHidden+'</form>');
        EC$('#formAgreement').trigger('submit');
        return false;
    }
    location.href = sUrl;
}

// 회원정보 가입중 여부 : 미동작
var bMemberJoinAction = false;

// 이메일 중복체크 동작 : 미동작
var bCheckedEmailDoing = false;

// SNS회원정보 가입중 여부 : 미동작
var bSnsMemberJoinAction = false;

/**
 * submit 할 때 display none 되어 있는 부분 전부 지워버리고 submit
 * post value name 이 겹치지 않기 위해 삭제
 */
function memberJoinAction()
{
    // 이메일 중복 체크 기능 동작중일경우 미실행한다
    if (bCheckedEmailDoing) {
        bMemberJoinAction = true;
        console.log('Checking email');
        return;
    }

    var sRealNameEncrypt = decodeURIComponent(EC$(parent.top.document).contents().find("input[name='realNameEncrypt']").val());
    // 인앱에서 본인인증을 완료했다면 sRealNameEncrypt 값 따로 넣어주기
    if (EC$('#realNameEncrypt').val() == '' && sRealNameEncrypt != '' && sRealNameEncrypt != 'undefined') {
        EC$('#realNameEncrypt').val(sRealNameEncrypt);
    }

    // 백업 내용있을경우 원복을 한다
    for (var key in globalJoinData) {
        if (typeof globalJoinData[key] == 'object') {
            EC$('#'+key).attr("fw-filter", globalJoinData[key]['fw-filter']);
        }
    }

    // 감춤 영역의 fw-filter 설정을 백업 한다
    EC$('#joinForm [fw-filter*="is"]:not(:visible)').each(function(){
        globalJoinData[EC$(this).attr('id')] = {"fw-filter" : EC$(this).attr('fw-filter')};
        EC$(this).removeAttr("fw-filter");
    });

    //아이핀 인증 체크
    if (SHOP.getLanguage() === 'ko_KR' && EC$('#member_name_cert_flag').val() == 'T' && EC$('#is_ipin_auth_use').val() == 'T' && EC$('#realNameEncrypt').val() == '') {
        alert(__('회원 인증을 해주세요.'));
        return false;
    }

    // 휴대폰 인증 체크
    if (SHOP.getLanguage() == 'ko_KR' && EC$('#member_name_cert_flag').val() == 'T' && EC$('#is_mobile_auth_use').val() == 'T' && EC$('#realNameEncrypt').val() == '') {
        // 모바일일때 회원 모바일 인증 HTML 삽입되어 있는지 확인 후 모바일 인증체크, 기존 모바일인증 사용자 회원가입 정상 동작 때문
        if ( mobileWeb ) {
            if ( EC$("#authMember").get(0) ) {
                alert(__('회원 인증을 해주세요.'));
                return false;
            }
        } else {
            alert(__('회원 인증을 해주세요.'));
            return false;
        }
    }

    //주민번호 검사
    //실명인증 안할때만 검사
    if (EC$('#is_display_register_ssn').val() == 'T' && EC$('input[name=member_type]:checked').val() == 'p' && EC$('#member_name_cert_flag').val() != 'T') {
        if (EC$('#ssn1').val() == '' || EC$('#ssn2').val() == ''){
            alert(__('주민등록번호를 입력 해주세요.'));
            EC$('#ssn1').focus();
            return false;
        }

        if (isSsn(EC$('#ssn1').val(), EC$('#ssn2').val()) == false) {
            alert(__('올바른 주민등록번호를 입력해 주세요.'));
            EC$('#ssn1').focus();
            return false;
        }

    }

    // EC-14044
    if (EC$('input[id^="identification_check"]:visible').length > 0) {
        if (EC$('input[id^="identification_check"]:visible')[0].checked !== true) {
            EC$('input[id^="identification_check"]:visible')[0].focus();
            alert(__('고유식별정보 처리에 동의해 주세요.'));
            return false;
        }
    }
    // EC-14044
    if (EC$('input[id^="f_identification_check"]:visible').length > 0) {
        if (EC$('input[id^="f_identification_check"]:visible')[0].checked !== true) {
            EC$('input[id^="f_identification_check"]:visible')[0].focus();
            alert(__('고유식별정보 처리에 동의해 주세요.'));
            return false;
        }
    }

    //id 중복 체크
    if (EC$('#joinForm #member_id').val() != '' && EC$('#idDuplCheck').val() != 'T') {
        // ECHOSTING-198247 id 잘못되어진 패턴인경우에 대한 alert 문구 보완 
        var sMsg = '';
        // id 관련 에러 메시지가 있는경우만 띄워준다
        if (EC$("#idMsg").attr('id') =='idMsg' && EC$("#idMsg.error").attr('id')) {
            sMsg = EC$("#idMsg").text().split('.').join(".\n");
        }
        sMsg = (sMsg) ? sMsg : __('CHECK.FOR.DUPLICATE.IDS.001');
        alert(sMsg);
        EC$('#member_id').focus();
        return false;
    }
    
    if (EC$('#email1').val() == '' || EC$('#email2').val() == '') {
        alert(__('이메일을 입력하세요.'));

        if (EC$('#email1').val() == '')            EC$('#email1').focus();
        else if (EC$('#email2').val() == '')       EC$('#email2').focus();

        return false;
     }

    // // 이메일 input 정보가 존재할경우
    if (EC$('#email1').length > 0 && EC$('#email2').length > 0) {
        var sEmail = EC$('#email1').val()+'@'+EC$('#email2').val();
    } else {
        var sEmail = EC$('#email1').val();
    }

    if (EC$('#email1').val() != undefined) {
        if ((FwValidator.Verify.isEmail(sEmail) == false && sEmail != null) || sEmail.length > 255) {
            alert(__('입력하신 이메일을 사용할 수 없습니다.'));
            EC$('#email1').focus();
            return false;
        }
    }

    // [ECHOSTING-382207] [컨버스코리아_자사몰] 국문몰도 이메일 로그인 회원가입 기능개선
    if ((EC$("#useCheckEmailDuplication").val() == "T" || EC$('#is_email_auth_use').val() == 'T' || EC$('#login_id_type').val() == 'email') && // 이메일 중복 체크 사용 || 이메일 회원인증 수단 사용 || 가입기준 이메일
        bCheckedEmailDupl == false && // 이메일 중복체크가 안되었음
        EC$('#email1').length > 0) { // 이메일 항목이 있을경우 (회원가입기준 이메일로 SNS 회원가입시 SNS 회원가입 사용여부 이메일항목이 체크안되어있는경우는 중복체크 스킵)
        if (EC$('#email1').parents().find('#sns_join').length > 0) {
            bMemberJoinAction = true;
            setTimeout(setDuplEmail(), 500);
        } else {
            alert( __("이미 가입된 이메일 주소입니다.\n쇼핑몰 가입여부를 다시 확인하여 주시거나 관리자에게 문의하여 주세요.") );
        }
        return false;
    }

    /**
     * Email 중복체크 => checkDuplEmail()의 결과값 emailDuplCheck.val()
     */
    if (EC$('#emailDuplCheck').val() != 'T') {
        if (EC$('#use_email_confirm').val() == 'T' || EC$("#useCheckEmailDuplication").val() == "T" || EC$('#is_email_auth_use').val() == 'T' || EC$('#login_id_type').val() == 'email') {
            // 이메일 중복 확인 전 실행 방지 처리
            if (EC$('#emailDuplCheck').val() == '' && iRerun < 10) {
                iRerun++;
                setTimeout(function(){ memberJoinAction(); }, 500);
                return false;
            }
            alert(__('DUPLICATE.EMAIL.CHECK', 'MEMBER.FRONT.VALIDATION'));
            EC$('#email1').focus();
            return false;
        }
    }

    //별명체크 / 별명이 필수 일때만 체크함.
    //need to include memberJoinCheckNick.js
    if (EC$('#nick_name_flag').val() == 'T' && check_nick_name_essn== true ) {
        var aCheckNick = checkLength(EC$('#nick_name').val());

        if (EC$('#nick_name_confirm').val() == 'F') {
            alert(__('별명이 잘못 되었습니다.'));
            EC$('#nick_name').focus();
            return false;
        }

        if (aCheckNick['passed'] == false) {
            alert(aCheckNick['msg']);
            EC$('#nick_name').focus();
            return false;
        }
    }

    // ECHOSTING-136604 직접 우편번호 입력시에는 입력내용에 대해 체크를 한다
    var bCheckKrZipcode = true;
    if (EC$('#direct_input_postcode1_addr0')) {
        if (EC$('#direct_input_postcode1_addr0').prop('checked')){
            if (EC$("#postcode1").val().match(/^[a-zA-Z0-9- ]{2,14}$/g) == null) {
                alert(__("우편번호는 영문, 숫자, 대시(-)만 입력가능합니다.\n입력내용을 확인해주세요."));
                EC$("#postcode1").focus();
                return false;
            }
            bCheckKrZipcode = false;
        }
    }

    // 주소 필수시 체크 ( 심플 가입이 아닐때만 ) 
    if ( EC$('#is_display_register_addr').val() == 'T'  && EC$("#useSimpleSignin").val() !='T' ) {
        
        if ( SHOP.getLanguage() == 'ko_KR') {
            if ( EC$('#postcode1').val() == '') {
                alert(__('주소를 입력해주세요'));
                EC$('#postcode1').focus();
                return false;
            }
        }

        if ( EC$('#display_required_address').val() == 'T' && EC$('#addr1').val() == '' ) {
            alert(__('주소를 입력해주세요'));
            var sisDesignPosibbleFlag = "F";
            if (SHOP.getLanguage() == 'zh_CN' || SHOP.getLanguage() == 'zh_TW') {
                sisDesignPosibbleFlag = setAddressOfLanguage.isDesignPosibbleController();
            }
            if (sisDesignPosibbleFlag == "F") {
                EC$('#addr1').focus();
            }
            return false;
        }
        
        if ( EC$('#display_required_address2').val() == 'T' && EC$('#addr2').val() == '' ) {
            alert(__('주소를 입력해주세요'));
            EC$('#addr2').focus();
            return false;
        }
    }

    // 우편번호 체크
    if (memberCommon.checkZipcode(bCheckKrZipcode) === false) {
        return false;
    }

    if (EC$('#is_display_register_name').val() == 'T' && EC$("#useSimpleSignin").val() !='T') {
        if (SHOP.getLanguage() != 'ko_KR') {
            if (EC$('#sUseSeparationNameFlag').val() == 'T' && EC$('#last_name').length < 1) {
                alert(sprintf(__('%s 항목은 필수 입력값입니다.'), __('이름')));
                return false;
            } else if (EC$('#sUseSeparationNameFlag').val() == 'T' && EC$('#last_name').length > 0) {
                if (EC_UTIL.trim(EC$('#last_name').val()) == '') {
                    alert(sprintf(__('%s 항목은 필수 입력값입니다.'), __('이름')));
                    EC$('#last_name').focus();
                    return false;
                }
            }
        }
    }

    // 영문이름 체크
    if ( EC$('#is_display_register_eng_name').val() == 'T'  && EC$("#useSimpleSignin").val() !='T' ) {
        if ( EC$('#name_en').val() == '' && EC$('#name_en').length > 0) {
            alert(sprintf(__('%s를 입력해 주세요.'), __('이름(영문)')));
            EC$('#name_en').focus();
            return false;
        }

        if (SHOP.getLanguage() != 'ko_KR') {
            if (EC$('#sUseSeparationNameFlag').val() == 'T' && EC$('#last_name_en').length < 1) {
                alert(sprintf(__('%s를 입력해 주세요.'), __('이름(영문)')));
                return false;
            } else if (EC$('#sUseSeparationNameFlag').val() == 'T' && EC$('#last_name_en').length > 0) {
                if (EC_UTIL.trim(EC$('#last_name_en').val()) == '') {
                    alert(sprintf(__('%s를 입력해 주세요.'), __('이름(영문)')));
                    EC$('#last_name_en').focus();
                    return false;
                }
            }
        }
    }

    // 이름(발음) 체크
    if ( EC$('#is_display_register_name_phonetic').val() == 'T'  && EC$("#useSimpleSignin").val() !='T' ) {
        if ( EC$('#name_phonetic').val() == '' && EC$('#name_phonetic').length > 0) {
            alert(sprintf(__('%s를 입력해 주세요.'), __('이름발음')));
            EC$('#name_phonetic').focus();
            return false;
        }

        if (SHOP.getLanguage() != 'ko_KR') {
            if (EC$('#sUseSeparationNameFlag').val() == 'T' && EC$('#last_name_phonetic').length < 1) {
                alert(sprintf(__('%s를 입력해 주세요.'), __('이름발음')));
                return false;
            } else if (EC$('#sUseSeparationNameFlag').val() == 'T' && EC$('#last_name_phonetic').length > 0) {
                if (EC_UTIL.trim(EC$('#last_name_phonetic').val()) == '') {
                    alert(sprintf(__('%s를 입력해 주세요.'), __('이름발음')));
                    EC$('#last_name_phonetic').focus();
                    return false;
                }
            }
        }
    }

    if (memberCommon.checkUsStatename() === false) {
        return false;
    }

    // 일반전화 체크
    if (memberCommon.checkJoinPhone() === false) {
        return false;
    }

    // 휴대전화 체크
    if (memberCommon.checkJoinMobile() === false) {
        return false;
    }

    // 회원구분 타입에 따른 '이름(법인명)' 체크
    var sName = '';
    var sId   = '';
    if (EC$('#member_type0').prop('checked')) {
        // 개인회원
        
        if (EC$("input[name='personal_type']:checked").val() == 'e') sId = 'name';
        else if (EC$('#personal_type0').val() == 'i' || EC$('#personal_type0').val() == 'm') sId = ''; // 실명 인증으로 아이핀만 사용할 경우 예외 처리
        else if ( EC$('#personal_type0').val() == 'i' && EC$('#personal_type1').val() == 'm' ) sId = '';
        else if (EC$('#name').length) sId = 'name';
        else if (EC$('#personal_type0').prop('checked')) sId = 'real_name';

        if (sId != '' && EC$('#mCafe24SnsAgree').css('display') != 'block' && (EC$('#is_display_register_name').val() == 'T' || EC$('#is_email_auth_use').val() == 'T') ) {
            sName = EC_UTIL.trim(EC$('#'+sId).val());
            if (sName.length == 0) {
                alert(sprintf(__('%s 항목은 필수 입력값입니다.'), __('이름')));
                EC$('#'+sId).focus();
                return false;
            }
        }
        // 개인회원일때 국제 체크제거
        if ( EC$("#citizenship").get(0) ) {
            globalJoinData['citizenship'] = {"fw-filter" : EC$("#citizenship").attr('fw-filter')};
            EC$("#citizenship").removeAttr("fw-filter");
        }

    }
    else if (EC$('#member_type1').prop('checked')) {

        // 사업자회원
        if (EC$('#company_type0').prop('checked')) {

            // 개인사업자
            if (EC$('#personal_type0').val() == 'i' || EC$('#personal_type0').val() == 'm') sId = ''; // 실명 인증으로 아이핀만 사용할 경우 예외 처리
            else if ( EC$('#personal_type0').val() == 'i' && EC$('#personal_type1').val() == 'm' ) sId = 'name';
            else if (!EC$('#personal_type0').attr('name')) sId = 'name';
            else if (EC$('#personal_type0').prop('checked')) sId = 'real_name';

            if (sId != '' && EC$('#is_display_register_name').val() == 'T' ) {
                sName = EC_UTIL.trim(EC$('#'+sId).val());
                if (sName.length == 0) {
                    alert(sprintf(__('%s 항목은 필수 입력값입니다.'), __('이름')));
                    EC$('#'+sId).focus();
                    return false;
                }

            }
            sCname = EC_UTIL.trim(EC$('#cname').val());
            if (sCname.length == 0) {
                alert(__('상호명을 입력해 주세요.'));
                EC$('#cname').focus();
                return false;
            }
        } else if (EC$('#company_type1').prop('checked')) {
            // 법인사업자
            sName = EC_UTIL.trim(EC$('#bname').val());
            if (sName.length == 0) {
                alert(__('법인명을 입력해 주세요.'));
                EC$('#bname').focus();
                return false;
            }
            
            var bssn1 = EC$('#bssn1').val();
            var bssn2 = EC$('#bssn2').val();
            var realNameEncrypt = EC$('#realNameEncrypt').val();
            
            if (EC_UTIL.trim(bssn1).length < 1 || EC_UTIL.trim(bssn2).length < 1 ) {
                alert( __('법인 번호를 입력하여 주세요.') );
                EC$('#bssn1').focus();
                return false;
            }
            if (EC_UTIL.trim(realNameEncrypt).length < 1) {
                alert( __('법인번호 중복체크를 해주세요.') );
                EC$('#bssn1').focus();
                return false;
            }            
        }

        sCssn = EC_UTIL.trim(EC$('#cssn').val());
        if (sCssn.length == 0) {
            alert(__('사업자번호를 입력해 주세요.'));
            EC$('#cssn').focus();
            return false;
        }

        // 사업자번호 관련 에러 메시지가 있는 경우
        if (EC$("#cssnMsg").attr('id') =='cssnMsg' && EC$("#cssnMsg").hasClass('error')) {
            alert(EC$("#cssnMsg").text());
            EC$('#cssn').focus();
            return false;
        }

        // 중복 제한 체크 설정 했는데 체크 버튼을 클릭 안한 경우
        if (EC$('#use_checking_cssn_duplication').val() == 'T' && EC$('#cssnDuplCheck').val() == 'F') {
            alert(__('사업자번호 중복 체크를 해주세요'));
            EC$('#cssn').focus();
            return false;
        }

        // 개인회원일때 국제 체크제거
        if ( EC$("#citizenship").get(0) ) {
            globalJoinData['citizenship'] = {"fw-filter" : EC$("#citizenship").attr('fw-filter')};
            EC$("#citizenship").removeAttr("fw-filter");
        }
    } else if (EC$('#member_type2').prop('checked') && (EC$('#is_display_register_name').val() == 'T' || EC$('#is_email_auth_use').val() == 'T')) {
        //개인회원과 외국인회원 반복했을때 attr 지워진거 복구
        if ( globalJoinData['citizenship'] && globalJoinData['citizenship']['fw-filter'] ) {
            EC$("#citizenship").attr('fw-filter',globalJoinData['citizenship']['fw-filter'] || '');
        }

        // 외국인회원
        if (EC$("input[name='foreigner_type']:checked").val() == 'e') {
            sName = EC_UTIL.trim(EC$('#foreigner_name').val());
            if (sName.length == 0) {
                alert(sprintf(__('%s 항목은 필수 입력값입니다.'), __('이름')));
                EC$('#foreigner_name').focus();
                return false;
            }
        }
        // ECHOSTING-89438 이메일 인증시 외국인 번호 체크 제외
        if (EC$('#is_display_register_name').val() == 'T' && EC$("input[name='foreigner_type']:checked").val() != 'e') {
            var foreignerType = EC$('input[name=foreigner_type]:checked').val();
            var foreignerSsn  = EC$('#foreigner_ssn').val();
            var realNameEncrypt = EC$('#realNameEncrypt').val();
            var sType = '';

            if (foreignerType == 'f') sType = __('외국인 등록번호');
            else if (foreignerType == 'p') sType = __('여권번호');
            else if (foreignerType == 'd') sType = __('국제운전면허증번호');
            
            if (EC_UTIL.trim(foreignerSsn).length < 1) {
                alert(sprintf(__('%s를 입력해 주세요.'), sType));
                EC$('#foreigner_ssn').focus();
                return false;
            }
            
            if (EC_UTIL.trim(realNameEncrypt).length < 1) {
                alert(sprintf(__('%s 중복체크를 해주세요.'), sType));
                EC$('#foreigner_ssn').focus();
                return false;            
            }
        }
        
    } else {
        // 기본은 가입요청시 감춤영역의 fw-filter 값들은 백업한다
        // 감춤 영역의 fw-filter 설정을 백업 한다
        EC$('#joinForm .displaynone [fw-filter*="is"]').each(function(){
            globalJoinData[EC$(this).attr('id')] = {"fw-filter" : EC$(this).attr('fw-filter')};
            EC$(this).removeAttr("fw-filter");
        });
    }

    if (memberVerifyMobile.isMobileVerify() === false) {
        alert(__('VERIFY.YOUR.MOBILE.NUMBER', 'MEMBER.UTIL.VERIFY'));
        return false;
    }

    //날짜 체크
    var aCheckDateMap = [{'idPrefix' : 'birth', 'idName' : __('생년월일')}, {'idPrefix' : 'marry', 'idName' : __('결혼기념일')}, {'idPrefix' : 'partner', 'idName' : __('배우자 생일')}];

    for (var i = 0; i < aCheckDateMap.length; i++) {
        var bDateResult = checkDate(aCheckDateMap[i]['idPrefix'], aCheckDateMap[i]['idName']);
        if (bDateResult == false) return false;
    }

    // 환불계좌 정보 체크
    if ( EC$('#is_display_bank').val() == 'T'  && EC$("#useSimpleSignin").val() !='T' ) {
        if (EC$('#bank_account_owner').val() == '') {
            alert('예금주를 입력해주세요');
            EC$('#bank_account_owner').focus();

            return false;
        } else if (EC$('#refund_bank_code').val() == '') {
            alert('은행명을 선택해주세요');
               EC$('#refund_bank_code').focus();

               return false;
        } else if (EC$('#bank_account_no').val() == '') {
            alert('환불 계좌번호를 입력해주세요');
            EC$('#bank_account_no').focus();
            
            return false;
        }
    }
    
    // 추천인 ID 체크
    var sRecoId = EC$('#joinForm #reco_id').val();
    if (EC_UTIL.trim(sRecoId) != '') {
        if (sRecoId == EC_UTIL.trim(EC$('#joinForm').find('#member_id').val())) {
            alert(__('자기자신을 추천인으로 등록할 수 없습니다.'));
            EC$('#joinForm #reco_id').focus();
            return false;
        }
    }

    if (validatePassword() === false) {
        return false;
    }

    var result = FwValidator.inspection('joinForm');

    if (result.passed == true) {
        if (EC$("#is_use_checking_join_info").val()==="T") {
            if (CheckingJoinInfo()===true) return false;
        }

        try {
            if (memberCommon.optionalCheck() === false) {
                return false;
            }
        } catch (e) {}

        // sns 가입창일경우 joinForm 진행하지 않는다
        if (EC$('#mCafe24SnsAgree').css('display') == 'block') {
            // sns 가입진행
            // snsJoin();
            memberSns.joinProc();
            return false;
        }
        EC$('#joinForm').submit();
    }
}

/**
 * 주민번호 검사
 * @param ssn1 주민번호 앞자리
 * @param ssn2 주민번호 뒷자리
 * @returns {Boolean}
 */
function isSsn( ssn1, ssn2 )
{
    check_arr = new Array( 2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5 );
    buff = new Array();

    ssn_len = 13;
    ssn = ssn1 + ssn2;

    for ( i = 0; i < ssn_len; i++ ) {
        buff[i] = ssn.substr( i, 1 );
    }

    for ( i = sum = 0; i < 12; i++ ) {
        sum += ( buff[i] *= check_arr[i] );
    }

    if ( ( ( 11 - ( sum % 11 ) ) % 10 ) != buff[12] )
        return false;

    return true;
}



/**
 * 유선전화
 * @param sElementName 체크 할 엘리먼트 id
 */
function checkPhone(sElementName)
{
    var sFirstNumber = EC$('#' + sElementName + '2').val();//국번
    var sLastNumber = EC$('#' + sElementName + '3').val();//뒷번호

    var regexp = /^\d{3,4}$/;
    var bResultFirst = regexp.test(sFirstNumber);

    regexp = /^\d{4}$/;
    var bResultLast = regexp.test(sLastNumber);

    return ((bResultFirst && bResultLast));
}

/**
 * 휴대전화 체크
 * @param sElementName 체크 할 엘리먼트 id
 */
function checkMobile(sElementName)
{

    var sTelComp = EC$('#' + sElementName + '1').val();//통신사
    var sFirstNumber = EC$('#' + sElementName + '2').val();//국번
    var sLastNumber = EC$('#' + sElementName + '3').val();//뒷번호

    var regexp = /^\d{3}$/;
    var bResultTelComp = regexp.test(sTelComp);

    var regexp = /^\d{3,4}$/;
    var bResultFirst = regexp.test(sFirstNumber);

    regexp = /^\d{4}$/;
    var bResultLast = regexp.test(sLastNumber);

    return ((bResultTelComp && bResultFirst && bResultLast));
}


/**
 * 생일, 결혼기념일, 배우자 생일 체크
 * @param string sIdPrefix 검사항목의 id prefix
 * @param string sIdName alert 에 띄울 항목명
 * @returns {Boolean}
 */
function checkDate(sIdPrefix, sIdName)
{
    if (EC$('#' + sIdPrefix + '_year').length == 0 || EC$('#' + sIdPrefix + '_month').length == 0 || EC$('#' + sIdPrefix + '_day').length == 0) {
        return true;
    }

    if (EC$('#' + sIdPrefix + '_year').val() != '' || EC$('#' + sIdPrefix + '_month').val() != '' || EC$('#' + sIdPrefix + '_day').val() != '') {
        var oToday = EC_GLOBAL_DATETIME.parse('', 'shop');
        var iTodayYear = oToday.format(EC_GLOBAL_DATETIME.const.YEAR_ONLY);
        var iTodayMonth = oToday.format(EC_GLOBAL_DATETIME.const.MONTH_ONLY);
        var iTodayDate = oToday.format(EC_GLOBAL_DATETIME.const.DAY_ONLY);
        var FIX_NOW_DATE = parseInt('' + iTodayYear + iTodayMonth + iTodayDate);
        var FIX_MIN_DATE = 19000101;

        year = EC_UTIL.trim(EC$('#' + sIdPrefix + '_year').val());
        month = EC_UTIL.trim(EC$('#' + sIdPrefix + '_month').val());
        month = month.length == 1 ? '0' + month : month;
        day = EC_UTIL.trim(EC$('#' + sIdPrefix + '_day').val());
        day = day.length == 1 ? '0' + day : day;
        userDate = parseInt(year + month + day);
        lastday = EC_GLOBAL_DATETIME.parse('', 'shop')
            .set('year', year)
            .set('month', month)
            .set('date', 0)
            .date();
        
        if (userDate.toString().length < 8 || userDate.toString().length > 8) {
            alert(__('존재하지 않는 날짜 입니다.'));
            EC$("input[name^='"+sIdPrefix+"']").val('').first().focus();
            return false;
        } else if (month < 1 || month > 12) {
            alert(__('존재하지 않는 날짜 입니다.'));
            EC$('#' + sIdPrefix + '_month').val('').focus();
            return false;
        } else if (day < 1 || day > lastday) {
            alert(__('존재하지 않는 날짜 입니다.'));
            EC$('#' + sIdPrefix + '_day').val('').focus();
            return false;
        } else if (userDate < FIX_MIN_DATE) {        
            alert(__('1900년 이후부터 입력 가능 합니다.'));
            EC$("input[name^='"+sIdPrefix+"']").val('');
            EC$("input[name^='"+sIdPrefix+"_year']").focus();
            return false;
        } else if (userDate > FIX_NOW_DATE) {        
            alert(__('오늘날짜 까지 입력 할 수 있습니다.'));
            EC$("input[name^='"+sIdPrefix+"']").val('').first().focus();
            return false;
        }
    }
    return true;
}

/**
 * 아이디 중복 체크
 */
function checkId(url)
{
    if (url) {
        sIdDuplicateCheckUrl = url;
    }

    if (mobileWeb == true && EC$('#idMsg').length > 0) {
        checkDuplId();
    } else {
        AuthSSLManager.weave({
            'auth_mode': 'encrypt',
            'aEleId': [EC$("#joinForm #member_id")],
            'auth_callbackName': 'checkIdEncryptedResult'
        });
    }
}

/**
 * 이메일 중복 체크
 */
function checkEmail(url)
{
    if (mobileWeb == true && EC$('#emailMsg').length > 0) {
        checkDuplEmail();
    } else {
        var oEmail = EC$('#joinForm input[name=email1]');
        var agent = navigator.userAgent.toLowerCase();
        var bodyHeight = EC$('body').height();

        oEmail.val(sEmail = EC_UTIL.trim(oEmail.val()));

        // 모바일웹일 경우 레이어창으로 오픈
        if (agent.indexOf('iphone') != -1 || agent.indexOf('android') != -1) {
            EC$('body').append('<div id="emailLayer" style="position:absolute; top:0; left:0; width:100%; height:'+bodyHeight+'px; background:#fff; z-index:999;"><iframe src="'+url+'?email='+sEmail+'" style="width:100%; height:'+bodyHeight+'px; border:0;"></iframe></div>');
            //EC$('input, a, select, button, textarea, .trigger').hide();//ECHOSTING-42532
            EC$(window).scrollTop(0);
        } else {
            //상단 또는 좌우측에 에 로그인 form 이 있을 수 있기 때문에 id가 아닌 form으로 접근 함
            window.open( url + '?email=' + sEmail , 'echost_email_check', 'width=400, height=400');
        }
    }
}

/**
 * 아이디중복체크 암호화 처리 (일반)
 * @param output
 */
function checkIdEncryptedResult(output)
{
    var sEncrypted = encodeURIComponent(output);

    if (AuthSSLManager.isError(sEncrypted) == true) {
        return;
    }

    var oMemberId = EC$('#joinForm input[name=member_id]');
    var agent = navigator.userAgent.toLowerCase();
    var bodyHeight = EC$('body').height();

    oMemberId.val(EC_UTIL.trim(oMemberId.val()));

    // 모바일웹일 경우 레이어창으로 오픈
    if (agent.indexOf('iphone') != -1 || agent.indexOf('android') != -1) {
        EC$('body').append('<div id="idLayer" style="position:absolute; top:0; left:0; width:100%; height:'+bodyHeight+'px; background:#fff; z-index:999;"><iframe src=' + sIdDuplicateCheckUrl + '?encrypted_str=' + sEncrypted + '" style="width:100%; height:'+bodyHeight+'px; border:0;"></iframe></div>');
        //EC$('input, a, select, button, textarea, .trigger').hide();//ECHOSTING-42532
        EC$(window).scrollTop(0);
    } else {
        //상단 또는 좌우측에 에 로그인 form 이 있을 수 있기 때문에 id가 아닌 form으로 접근 함
        window.open(sIdDuplicateCheckUrl + '?encrypted_str=' + sEncrypted , 'echost_id_check', 'width=400, height=400');
    }
}

/**
 * 아이디중복체크 암호화 처리 (레이어)
 * @param output
 */
function checkIdEncryptedResultForLayer(output)
{
    var sEncrypted = encodeURIComponent(output);

    if (AuthSSLManager.isError(sEncrypted) == true) {
        return;
    }

    var oMemberId = EC$('#joinForm input[name=member_id]');
    var sFormMemberId = EC_UTIL.trim(oMemberId.val());

    if (EC$('#idLayer').length < 1) {
        oMemberId.val(sFormMemberId);
        var iWidth = 440;
        var iHeight = 270;
        var sHtml = '<div id="idLayer" style="overflow:hidden; position:absolute; top:50%; left:50%; z-index:999; width:' + iWidth + 'px; margin:-120px 0 0 -220px; border:1px solid #7f8186; color:#747474; background:#fff; display:none">' + '<iframe id="checkIdLayerFrame" src=' + sIdDuplicateCheckUrl + '?encrypted_str=' + sEncrypted + '" style="width:' + iWidth + 'px; height:' + iHeight + 'px; border:0;" frameborder="0"></iframe>' + '</div>';
        EC$('body').append(sHtml);
    } else {
        var oFrame = EC$('#checkIdLayerFrame').contents();
        oFrame.find('#popup').hide();
        oFrame.find('#member_id').val(sFormMemberId);
        oFrame.find('#checkIdForm').submit();
    }

    EC$('#idLayer').show();
}

/**
 * 아이디 중복 체크 레이어
 */
function checkIdLayer(url)
{
    sIdDuplicateCheckUrl = url;

    AuthSSLManager.weave({
        'auth_mode': 'encrypt',
        'aEleId': [EC$("#joinForm #member_id")],
        'auth_callbackName': 'checkIdEncryptedResultForLayer'
    });
}

function setDuplEmail() {
    if (EC$('#email2').length > 0) {
        var sEmail = EC$('#email1').val() + '@' + EC$('#email2').val();
    } else {
        var sEmail = EC$('#email1').val();
    }

    if (EC$('#email1').val() != undefined) {

        if (EC$('#email1').val().length == 0) {
            EC$('#emailMsg').addClass('error').html(__('이메일을 입력해 주세요.'));
            return false;
        } else {
            if (FwValidator.Verify.isEmail(sEmail) == false || sEmail.length > 255) {
                EC$('#emailMsg').addClass('error').html(__('유효한 이메일을 입력해 주세요.'));
                return false;
            }
        }
    }
    checkDuplEmail();
}

/**
 * 휴대폰, 아이폰 인증 후 이름, 휴대폰 번호등 Decrypt
 */
function callEncryptFunction() {
    if (EC$('#email1').length > 0) {
        // 국내몰일 경우 이메일 중복 체크 기능을 사용하는 경우에만 호출.
        if ( SHOP.getLanguage() == 'ko_KR' ) {
            if ( EC$("#useCheckEmailDuplication").val() == "T" ) { setDuplEmail(); }
        }
        // 해외 몰일경우 그냥 호출.
        else {
            setDuplEmail();
        }
    }

    // 이메일 중복 체크 기능 동작중일경우 미실행한다
    if (bCheckedEmailDoing) {
        bSnsMemberJoinAction = true;
        console.log('Checking email');
        return;
    }

    callEncryptFunctionStep2();
}

function callEncryptFunctionStep2() {
    AuthSSLManager.weave({
        'auth_mode' : 'decryptClient', //mode
        'auth_string' : document.getElementById('realNameEncrypt').value, //auth_string
        'auth_callbackName'  : 'setDisplayMember'      //callback function
    });
}


/**
 * 휴대폰, 아이폰 인증 후 이름, 휴대폰 번호등 display
 */
function setDisplayMember(sEncodeMember)
{
    var output = decodeURIComponent(sEncodeMember);

    if ( AuthSSLManager.isError(output) == true ) {
        alert(output);
        return;
    }

    var aMember = AuthSSLManager.unserialize(output);
    
    if (EC$('#nameContents') != undefined) {
        EC$('#nameContents').html(aMember.name);
    }

    // sns 가입시 이름 세팅
    if (EC$('#snsNameContents') != undefined) {
        EC$('#snsNameContents').html(aMember.name);
    }
    
    try{
        EC$('#birth_year').val(aMember.birth_year);
        EC$('#birth_month').val(aMember.birth_month);
        EC$('#birth_day').val(aMember.birth_day);

        // 회원가입 페이지에서 필요한 구문
        if (EC$('#joinForm') != null) {

            if (EC$('#is_sms').val() != '' && EC$('#is_sms').val() != undefined && aMember.is_sms != '') {
                EC$('#is_sms').val(aMember.is_sms);
            } else if (EC$('#joinForm [name=is_sms]').val() == undefined) {
                EC$('#joinForm').append('<input type="hidden" id="is_sms" name="is_sms" value="' + aMember.is_sms + '"/>');
            }

            if (EC$('#is_news_mail').val() != '' && EC$('#is_news_mail').val() != undefined && aMember.is_news_mail != '') {
                EC$('#is_news_mail').val(aMember.is_news_mail);
            } else if (EC$('#joinForm [name=is_news_mail]').val() == undefined) {
                EC$('#joinForm').append('<input type="hidden" id="is_news_mail" name="is_news_mail" value="' + aMember.is_news_mail + '"/>');
            }

            if (EC$('input[name="agree_privacy_optional_check[]"]').val() != '' && EC$('input[name="agree_privacy_optional_check[]"]').val() != undefined && aMember.agree_privacy_optional_check != '') {
                EC$('input[name="agree_privacy_optional_check[]"]').val(aMember.agree_privacy_optional_check);
            } else {
                EC$('#joinForm').append('<input type="hidden" id="agree_privacy_optional_check[]" name="agree_privacy_optional_check[]" value="' + aMember.agree_privacy_optional_check + '"/>');
            }
        }

        if (EC$('#editForm') != null) {
            EC$('#mobile1').val(aMember.mobile1);
            EC$('#mobile2').val(aMember.mobile2);
            EC$('#mobile3').val(aMember.mobile3);
        }

    }catch(e){}
    
    if (aMember.sIsUnder14Joinable == 'F' || aMember.sIsUnder14Joinable == 'M') {
        checkIsUnder14({ birth : aMember.birth });
    }
}

/**
 * 계정 활성화 초대 메일 발송
 * @var sMemberId 회원 아이디
 */
function sendAccountActivationMail(sMemberId)
{
    var aParam = {
        "member_id": sMemberId,
        "invitation_type": "email"
    };
    EC$.ajax({
        url : '/exec/common/member/ActivationMail',
        data : aParam,
        success : function(res) {
            var sendResult = JSON.parse(res);

            if (sendResult.passed === true && sendResult.code === '0000'){
                alert(__('ACTIVATION.MAIL.SENDED', 'MEMBER.JOIN'));
                location.href = '/';
            } else if (sendResult.passed === false && sendResult.code === '0001') {
                alert(__('ACTIVATION.MAIL.FAIL', 'MEMBER.JOIN'));
            } else if (sendResult.passed === false && sendResult.code === '0002') {
                alert(__('ACTIVATION.MAIL.RESEND.VALID', 'MEMBER.JOIN'));
            }
        }
    });
}
/**
 * Date 관련 util
 *
 * @package resource
 * @subpackage util
 * @author 이장규
 * @since 2011. 10. 14.
 * @version 1.0
 *
 */

var utilDate = new function() {
    
    /**
     * valid 한 날짜 체크
     * @param string sYear 년도
     * @param string sMonth 월
     * @param string sDay 일
     * @return bool
     */
    this.checkDate = function(sYear, sMonth, sDay) {

        if (sMonth.substr(0, 1) == '0') sMonth = sMonth.substr(1, 1);
        if (sDay.substr(0, 1) == '0') sDay = sDay.substr(1, 1);

        sMonth -= 1;
        var sNewDate = new Date(sYear, sMonth, sDay);
        
        return (sNewDate.getFullYear() == sYear && (sNewDate.getMonth()) == sMonth && sNewDate.getDate() == sDay)
    }


}

