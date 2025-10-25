
const WeChat = '624331767'
const qq = '89265143'
const tel ='17607655581'

 

function getPatg(){
    if(window.location.pathname == '/'){
        return './image/1739174243892.jpg'
    }else{
        return '../image/1739174243892.jpg'
    }
}



//联系表单
$(function () {
    $("#submit").click(function () {
        var contacts = $("#contacts").val();
        var mobile = $("#mobile").val();
        var token = $("#token").val();
        var formid = $("#formid").val();
        var returntype = $("#returntype").val();
        var weixin = $('#weixin').val();
        var address = $('#address').val();
        var message = $('#message').val();

        if (!validateContact(contacts) || !validateMobile(mobile)) {
            return false;
        }

        var formData = {
            __token__: token, 
            __formid__: formid, 
            __returntype__: returntype, 
            contacts: contacts,
            mobile: mobile,
            weixin: weixin,
            address: address,
            message: message
        };

        // 禁用按钮并更改文本
        $(this).prop('disabled', true).text('提交中...');

        submitForm(formData, $(this));
    });

    console.log('加载了');
    
});

 
$('#WeChat').text(WeChat);
$('#tel').text(tel);
$('#qq').text(qq);
$(".compy").hide()
$('#wecharImg').attr('src', getPatg())


function validateContact(contacts) {
    if (contacts == "") {
        layer.msg('联系人不能为空');
        return false;
    }
    return true;
}

function validateMobile(mobile) {
    if (mobile == "") {
        layer.msg('手机号不能为空');
        return false;
    } else if (!/^1[3456789]\d{9}$/.test(mobile)) {
        layer.msg('手机号格式错误');
        return false;
    }
    return true;
}

function submitForm(formData, submitButton) {
    console.log(formData,'formData');
    
    // $.post("/index.php/index/myform/index", formData, function (results) {
    //     var wxh = $('#wxh').val(); // 微信账号
    //     var ewm = $('#ewm').val(); // 二维码
    //     var title = results.code == '1' ? '领取成功,请添加微信客服' + wxh : '您已领取,请添加客服微信' + wxh;
    //     var content = '<img src="' + ewm + '" style="width: 300px;height: 300px;">';

    //     layer.open({ title: title, type: 1, shadeClose: true, content: content });
    // }).fail(function () {
    //     layer.msg('请求失败，请稍后重试');
    // }).always(function () {
    //     // 请求完成后重新启用按钮
    //     submitButton.prop('disabled', false).text('提交');
    //     clearForm();
    // });

    $.post('/api/add', {
        ContactName: formData.contacts,
        ContactPhone: formData.mobile,
        WeChatID: formData.weixin,
        ShippingAddress: formData.address
    }, function (response) {
        layer.msg('提交成功!');
       setTimeout(() => {
        var ewm = $('#ewm').val(); // 二维码
        var title = response.code == 200 ? '领取成功,请添加微信客服' + WeChat : '您已领取,请添加客服微信' + wxh;
        var content = '<img src="' + getPatg() + '" style="width: 300px;height: 300px;">';
        layer.open({ title: title, type: 1, shadeClose: true, content: content });
       }, 2000);
    }).fail(function (xhr) {
        layer.msg('请求失败，请稍后重试');
    }).always(function () {
        // 请求完成后重新启用按钮
        submitButton.prop('disabled', false).text('提交');
        clearForm();
    });
}

function clearForm() {
    $("input[type='text'], select, input[id='formid']").val("");
}

/*侧栏切换*/
$(function(){
	$("#sliderbar_Show").click(function(){
		$('#sliderbar_View').animate({width:'show',opacity:'show'},100,function(){$('#sliderbar_View').show();});
		$('#sliderbar_Show').hide();$('#sliderbar_Hide').show();        
	});
	$("#sliderbar_Hide").click(function(){
		$('#sliderbar_View').animate({width:'hide', opacity:'hide'},100,function(){$('#sliderbar_View').hide();});
		$('#sliderbar_Show').show();$('#sliderbar_Hide').hide();  
	});
});
var commonAccount={comfig:{isDebug:!1},InitIndexSweiperfun:function(){$(".ulthree_list li").hover(function(){var i=$(this).index();$(".ulone_list li").eq(i).addClass("current").siblings().removeClass("current"),$(".ultow_list li").eq(i).addClass("current").siblings().removeClass("current"),$(".ulthree_list li").eq(i).addClass("current").siblings().removeClass("current"),$(this).find(".red_b").show(),$(this).find(".blcak_b").hide(),$(".ulthree_list li").not(".current").find(".red_b").hide(),$(".ulthree_list li").not(".current").find(".blcak_b").show()})}};commonAccount.comfig.isDebug=!0,$(function(){commonAccount.InitIndexSweiperfun()});


function ztop(){
   
	window.scrollTo(0,0);  
  }
	$("#panel .icons li").not(".up,.down").mouseenter(function(){
        $("#panel .info").addClass('hover');
        $("#panel .info li").hide();
        $("#panel .info li."+$(this).attr('class')).show();
    });
    $("#panel").mouseleave(function(){
        $("#panel .info").removeClass('hover');
    })
    $(".icons .up").click(function(){
        $.fn.ronbongpage.moveSectionUp();
    });
    $(".icons .down").click(function(){
        $.fn.ronbongpage.moveSectionDown();
    });
    $(".index_cy").click(function(){
        $("#panel").toggle();
        $(".index_cy").addClass('index_cy2');
        $(".index_cy2").removeClass('index_cy');
    });