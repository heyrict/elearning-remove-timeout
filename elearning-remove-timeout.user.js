// ==UserScript==
// @name        elearning-remove-timeout
// @namespace   njmu-exam
// @description removl elearning timeout in exam & true answer view restriction
// @include     http://elearning.njmu.edu.cn/*
// @version     1.0
// @grant       none
// ==/UserScript==
//
// 说明：破解南京医科大学elearning平台考试时间限制与查看答案限制
// 功能：
//     - 自动保存(每隔15s)
//     - 移除考试时间限制?(beta)
//     - 移除对非法查看答案的限制
//     - 在答题页面追加答案链接
//
// 作者：南京医科大学2016级五年临床三班谢祯晖 <xiezh0831@yahoo.co.jp>
// Github: https://github.com/heyrict
//

DoHomeWorkModule.controller('DoHomeWorkController', ['$scope', '$state', 'MarkingProviderUrl', function ($scope, $state, MarkingProviderUrl) {
    $scope.testid = $G2S.request("TestID");
    $scope.pre = $G2S.request("pre");
    $scope.IsIE = 0; //是否为IE浏览器
    $scope.IsFirefox = 0;//是否为非IE浏览器
    $scope.Timelimit = 0;//考试时长
    $scope.UseTime = 0;//所用时长
    $scope.exercisecount = 0;
    $scope.wanchenglv = "----";//完成率默认----

    $scope.testCanSubmit = false; //此份作业可以提交
    $scope.iCanSubmit = false; //学生是否可以提交
    $scope.isLoad = false;     //学生答案是否已经加载完成

    var int_id;
    var surplusmiao = 0;
    var surplusfen = 0;
    var surplusshi = 0;
    //获取试卷题目
    var PaperInfo_Get = function (paperid) {
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/PaperInfo_Get";
        if ($scope.pre == undefined) {
            url = MarkingProviderUrl + "/PaperInfo_Get";
        } else {
            url = MarkingProviderUrl + "/PaperInfo_Get_Preview";
        }

        var param = { PaperID: paperid, TestID: testid };
        $scope.baseService.post(url, param, function (data) {
            $scope.paper = data.d.paper;
            $scope.papergrouplist = data.d.papergrouplist;
            $scope.exerciselist = data.d.exerciselist;
            $scope.ExerciseChoices = data.d.ExerciseChoices;
            $scope.Timelimit = 9999;
            $scope.exerciseConten = $scope.paper.Brief;
        });
        $scope.$on('ngPaperInfo', function (ngRepeatFinishedEvent) {
            // add answer page
            var __orig_title = $('.ng-binding').html();
            var testid = $scope.testid;
            var __new_title = __orig_title+' <a style="color:cyan;" href="/G2S/CourseLive/Test/viewResults?TestID='+testid+'">'+"答案"+"</a>";
            $('h4.ng-binding').html(__new_title);

            //锚点
            var flag = 0;
            $(".question_num li").each(function () {
                flag++;
                $(this).attr("index", flag);
                var orde = $(this).attr("orde");
                var exerciseid = $(this).attr("pid");
                $("#li_" + exerciseid).html(flag);
                $("#sp_" + exerciseid).text(flag + ".");

            });
            $('.question_num li').live('click', function () {
                var exerciseid = $(this).attr("pid");
                var _top = $("#sp_" + exerciseid).offset().top;
                $('html,body').animate({ 'scrollTop': _top }, 500);
            });

            if ($scope.IsFirefox == 1) {
                setInterval(function () {
                    $scope.$apply(EwebeditorByValue());
                }, 5000);
            }



        });
        $scope.$on('ngLoadTime', function (ngRepeatFinishedEvent) {
            var pre = $scope.pre;
            if (pre == undefined) {
                if ($scope.exerciselist.length > 10 && $scope.exerciselist.length <= 20) {
                    setTimeout(TestAnswer_Get, 1000);
                } else if ($scope.exerciselist.length > 20 && $scope.exerciselist.length <= 40) {
                    setTimeout(TestAnswer_Get, 1000);
                } else if ($scope.exerciselist.length > 40 && $scope.exerciselist.length <= 999) {
                    setTimeout(TestAnswer_Get, 2000);
                } else {
                    setTimeout(TestAnswer_Get, 600);
                }
                autosave();//改为在获取学生答案后再开始自动保存

            } else {
                $(".remain_box").hide();
                $(".paper_operation").hide();
                autosave();
            }

            var flag = 0;
            for (var i = 0; i < $scope.papergrouplist.length; i++) {
                var count = 0;
                var score = 0;
                for (var k = 0; k < $scope.exerciselist.length; k++) {
                    if (parseInt($scope.exerciselist[k].ParentExerciseID) < 0) {
                        $scope.exerciselist[k].ParentExerciseID = "-1";
                    }

                    if ($scope.papergrouplist[i].GroupID == $scope.exerciselist[k].PaperGroupID && $scope.exerciselist[k].ParentExerciseID != "-1") {
                        count++;
                        score = score + parseFloat($scope.exerciselist[k].Score);
                        $scope.exercisecount++;
                    }
                    $("#b_exercise_" + $scope.papergrouplist[i].GroupID).html(count);
                    $("#b_exercisescore_" + $scope.papergrouplist[i].GroupID).html(score.toFixed(1));
                }
            }
        });
    }

    //获取当前作业编号序号
    var ExerciseByOrder = function () {
        for (var i = 0; i < $scope.papergrouplist.length; i++) {
            var count = 0;
            var score = 0;
            for (var k = 0; k < $scope.exerciselist.length; k++) {
                if (parseInt($scope.exerciselist[k].ParentExerciseID) < 0) {
                    $scope.exerciselist[k].ParentExerciseID = "-1";
                }
                if ($scope.papergrouplist[i].GroupID == $scope.exerciselist[k].PaperGroupID && $scope.exerciselist[k].ParentExerciseID != "-1") {
                    $scope.exerciselist[k].Orde = k + 1;
                }
            }
        }
    }

    //判断当前id是否有子集
    $scope.exerciseIsson = function (id) {
        var flag = 0;
        for (var k = 0; k < $scope.exerciselist.length; k++) {
            if ($scope.exerciselist[k].ParentExerciseID == id) {
                flag = 1;
            }
        }
        return flag;
    }

    var Test_CanSeeTest = function () {
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/Test_CanSeeTest";
        var param = { TestID: testid, CheckUserID: -1, ret: 0 };
        $scope.baseService.post(url, param, function (data) {
            if (data.d == 0) {
                window.location.href = "StudentWorkList";
            }
        });
    }

 
    //获取考试详细
    var Test_Get = function () {
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/Test_Get";
        var param = { TestID: testid };
        $scope.baseService.post(url, param, function (data) {
            $scope.test = data.d;
            $scope.testCanSubmit = true; //此份作业可以提交
            //if ($scope.test.TimeStatus == 3 && $scope.test.Delay == 0) { //作业考试已结束&&禁止迟交的作业
            //    $scope.testCanSubmit = true; //此份作业可以提交
            //} else {
            //    $scope.testCanSubmit = true;
            //}
            $scope.ScaleTypeName = $scope.test.ScaleTypeName

            PaperInfo_Get($scope.test.PaperID);
        });
    }
    //获取答案
    var TestAnswer_Get = function () {

       
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/TestAnswer_Get";
        var param = { TestID: testid, CheckUserID: -1 };
        $scope.baseService.post(url, param, function (data) {  // 调用承诺API获取数据 .resolve

           

            if (data.d.ExerciseAnswerUsers != null) {
                $scope.UseTime = data.d.ExerciseAnswerUsers.UseTime;
            } else {
                $scope.UseTime = 0;
            }
         
            //如果不是考试不显示时间（试卷需要时间）
            if ($scope.test.Type !=2) {
                surplusfen = 0;
            }
            else {
                surplusfen = parseInt($scope.Timelimit) - parseInt($scope.UseTime);
            }
            //if (surplusfen > 0) {
            //    saveTime();
            //} else {
                $("#jishiqi").html("----");
            //}

            $scope.TestAnswer = data.d.ExerciseAnswers;
            $scope.TestUsers = data.d.TestUsers;
            if ($scope.TestUsers.Status < 20) {
                $scope.iCanSubmit = true

            } else {
                if ($scope.test.ScoreSource <= 1 && $scope.test.Type != "2") {
                    $scope.iCanSubmit = true
                } else {
                    flagdingshi = 200;//定时保存字段 默认数值为等于或小于120 大于120后不会执行定时保存了
                }
            }
            for (var i = 0; i < $scope.TestAnswer.length; i++) {
                var rows = $scope.TestAnswer[i];
                if (rows.Conten != "") {
                    if (rows.ExerciseType == 1) {
                        $scope.ExerciseChoicesClick(rows.ExerciseID, rows.Conten);
                    } else if (rows.ExerciseType == 2 || rows.ExerciseType == 3) {
                        var str = rows.Conten.split('wshgkjqbwhfbxlfrh_c');
                        if (str.length > 1) {
                            for (var kk = 0; kk < str.length; kk++) {
                                $('input[name="xuanze_' + rows.ExerciseID + '"]').each(function () {
                                    if ($(this).attr('pid') == str[kk]) {
                                        $(this).attr("checked", true);
                                        return;
                                    }
                                });
                            }
                        } else {
                            $('input[name="xuanze_' + rows.ExerciseID + '"]').each(function () {
                                if ($(this).attr('pid') == str) {
                                    $(this).attr("checked", true);
                                }
                            });
                        }
                        $scope.ExerciseCheckClick(rows.ExerciseID);
                    } else if (rows.ExerciseType == 4 || rows.ExerciseType == 11) {
                        if (document.getElementById("txt_" + rows.ExerciseID)) {
                            $("#txt_" + rows.ExerciseID).val(rows.Conten);
                            $scope.ExerciseTextClick(rows.ExerciseID, 0);
                        }
                    } else if (rows.ExerciseType == 5 || rows.ExerciseType == 18) {
                        //debugger;
                        if (document.getElementById("txt_" + rows.ExerciseID)) {
                            $("#txt_" + rows.ExerciseID).val(rows.Conten);
                            $scope.ExerciseTextClick(rows.ExerciseID, 0);
                        }
                        $("#txt_" + rows.ExerciseID).text(rows.Conten);
                    } else if (rows.ExerciseType == 8 || rows.ExerciseType == 9 || rows.ExerciseType == 10 || rows.ExerciseType == 13) {
                        try {
                            // debugger;
                            // $("#oEditor_" + rows.ExerciseID).val(rows.Conten);
                            // var editor = EWEBEDITOR.Replace("oEditor_" + rows.ExerciseID, { style: "mini", width: "880", height: "220" });
                            if ($scope.IsIE == 1) {
                                document.getElementById('frmoEditor_' + rows.ExerciseID).contentWindow.setHTML(rows.Conten);
                                $scope.ExerciseTextClick(rows.ExerciseID, 1);
                            } else {
                                $("#txt_" + rows.ExerciseID).val(rows.Conten.replace(/<[^>]+>|&nbsp;/g, ""));
                                $scope.ExerciseTextClick(rows.ExerciseID, 0);
                            }

                        } catch (e) {
                            // alert(e);
                        }
                    }
                }
            }
            $scope.isLoad = true;
        });
    }

    $scope.Loadewebeditorhtml = function (ExerciseID) {

        var strHtml = "";
        var strsplit = window.location.href.split("/CourseLive");
        var palyurl = strsplit[0];
        strHtml += "  <input type='hidden' name='oEditor_" + ExerciseID + "' id='oEditor_" + ExerciseID + "'  ng-value='frmoEditor" + ExerciseID + "'/>";
        strHtml += "<iframe src='" + palyurl + "/Frameworks/eWebEditor/ewebeditor.htm?id=oEditor_" + ExerciseID + "&style=mini' frameborder='0' scrolling='no' width='880' height='220' style='display: block;' id='frmoEditor_" + ExerciseID + "' onblur='ExerciseTextClick(" + ExerciseID + ",1)'></iframe>";
        return strHtml;
    }


    //计时器
    var flagSecond = 0;
    var saveTime = function () {
        var flagmiao = "0";
        var flagfen = "0";
        var flagshi = "0";
        for (var ii = 0; ii < 100; ii++) {
            if (parseInt(surplusfen) > 60) { surplusshi++; surplusfen = surplusfen - 60; }
        }
        if (parseInt(surplusfen) == 0) {
            if (parseInt(surplusshi) > 0) {
                surplusshi--;
                surplusfen = surplusfen + 60;
            }
        }
        if (parseInt(surplusmiao) == 0) { surplusfen--; surplusmiao = 59; }
        if (parseInt(surplusmiao) > 9) { flagmiao = ""; }
        if (parseInt(surplusfen) > 9) { flagfen = ""; }
        if (parseInt(surplusshi) > 9) { flagshi = ""; }
        $("#jishiqi").html(flagshi + surplusshi + ":" + flagfen + surplusfen + ":" + flagmiao + surplusmiao);
        surplusmiao--;
        flagSecond++;
        if (flagSecond == 120) {
            //定时120秒保存答案
            flagSecond = 0;
        }
        setTimeout(saveTime, 1000);
        //取消提交
        //if (surplusmiao == 0 && parseInt(surplusfen) == 0 && surplusshi == 0) {

        //    //$scope.TestTempSave_Upd();//关闭页面前最后再暂存一次可能导致暂存方法取了空数据
        //    var testid = $scope.testid;
        //    var url = MarkingProviderUrl + "/Test_Submit";
        //    var param = { TestID: testid };
        //    $scope.baseService.post(url, param, function (data) {
        //        window.location.href = "StudentWorkList";
        //    });
        //}
    }
    //获取用户信息
    var GetUser = function () {
        var url = MarkingProviderUrl + "/GetUser";
        var param = {};
        $scope.baseService.post(url, param, function (data) {
            $scope.User = data.d;
        });
    }

    //判断题答案保存
    $scope.ExerciseChoicesClick = function (ExerciseID, type) {
        if (type == 1) {
            $("#panduan_" + ExerciseID + "_" + 0).removeClass("active");
        } else {
            $("#panduan_" + ExerciseID + "_" + 1).removeClass("active");
        }
        $("#panduan_" + ExerciseID + "_" + type).addClass("active");
        ExerciseAnswerComment(ExerciseID, type, "1");
    }

    //单选/多选答案保存
    $scope.ExerciseCheckClick = function (ExerciseID) {
        var arr_v = new Array();
        $('input[name="xuanze_' + ExerciseID + '"]:checked').each(function () {
            arr_v.push($(this).attr('pid'));
        });
        var type = 0;
        if (arr_v != "") { type = 1; }
        var stras = arr_v;
        if (arr_v.length >= 1) {
            stras = "";
            for (var i = 0; i < arr_v.length; i++) {
                if (i != arr_v.length - 1) {
                    stras += arr_v[i] + "wshgkjqbwhfbxlfrh_c";
                } else {
                    stras += arr_v[i];
                }
            }
        }
        ExerciseAnswerComment(ExerciseID, stras, type);
    }
    //文本框/ewebeditor答案保存
    $scope.ExerciseTextClick = function (ExerciseID, type) {
        // debugger;
        var arr_v = "";
        if (type == 0) {
            arr_v = $("#txt_" + ExerciseID).val();
        } else {
            //debugger;
            arr_v = document.getElementById('frmoEditor_' + ExerciseID).contentWindow.getHTML();
            //EWEBEDITOR.UpdateAll();
            //arr_v = $("#oEditor_" + ExerciseID).val();
        }
        var type = 0;
        if (arr_v != "") {
            type = 1;
        }
        ExerciseAnswerComment(ExerciseID, arr_v, type);
    }

    //往对象里面插入答案
    var ExerciseAnswerComment = function (ExerciseID, comment, isactive) {
        //debugger;
        for (var i = 0; i < $scope.exerciselist.length; i++) {
            if (ExerciseID == $scope.exerciselist[i].ExerciseID) {
                $scope.exerciselist[i].ExerciseAnswerComment = comment;
                $scope.exerciselist[i].ExerciseAnswerIsactive = isactive;
                //$scope.exerciseReverse[i].ExerciseAnswerComment = comment;
                //$scope.exerciseReverse[i].ExerciseAnswerIsactive = isactive;
                break;
            }
        }
        var count = 0;
        for (var i = 0; i < $scope.exerciselist.length; i++) {
            if ($scope.exerciselist[i].ExerciseAnswerIsactive == 1) {
                count++;
            }
        }
        var wancheng = count / $scope.exercisecount;
        wancheng = wancheng * 100;
        if (wancheng != 100) {
            $scope.wanchenglv = wancheng.toFixed(2) + "%";
        } else {
            $scope.wanchenglv = wancheng + "%";
        }


    }


    //部分 收缩 展示
    $scope.GroupUpDown = function (index) {
        if ($(".ico_showhide").eq(index).attr("tid") == "1") {
            // var kid = $(thi).attr("kid");
            //$("#question_num_" + kid).hide();
            $(".question_num").eq(index).hide();
            $(".ico_showhide").eq(index).attr("tid", "2");
            $(".ico_showhide").eq(index).removeClass("ico_up");
            $(".ico_showhide").eq(index).addClass("ico_down ico_showhide");

        } else {
            $(".question_num").eq(index).show();
            $(".ico_showhide").eq(index).attr("tid", "1");
            $(".ico_showhide").eq(index).removeClass("ico_down");
            $(".ico_showhide").eq(index).addClass("ico_up ico_showhide");
        }
    }


    //暂存
    $scope.zancuntishi = function () {
        $scope.TestTempSave_Upd(1);
        

    }



    //保存答案
    $scope.TestTempSave_Upd = function (n) {

        if (!$scope.isLoad) return;

        if ($scope.IsFirefox == 1) {
            EwebeditorByValue();
        }

        var testid = $scope.testid;
        var answer = "";
        for (var i = 0; i < $scope.exerciselist.length; i++) {
            if ($scope.exerciselist[i].ParentExerciseID >= 0) {
                answer += $scope.exerciselist[i].ExerciseID + "wshgkjqbwhfbxlfrh_b" + $scope.exerciselist[i].ExerciseAnswerComment + "wshgkjqbwhfbxlfrh_a";
            }
        }
        var url = MarkingProviderUrl + "/TestTempSave_Upd";
        var param = { TestID: testid, Answer: answer };
        $scope.baseService.post(url, param, function (data) {
            if (n==2) {
                if (data.d == 1) {
                    Submit_Ing();
                } else if (data.d == 2) {
                    layer.msg("提交成功,但是提交的答案可能存在错误,请重新打开页面检查一下是否提交正确", { icon: 0, time: 2000 });
                    Submit_Ing();
                } else if (data.d == -1) {
                    layer.alert("提交时间已过", { icon: 2 });
                } else {
                    layer.alert("提交失败", { icon: 2 });
                }
            } else if (n == 1) {
                if (data.d == 1) {
                    layer.msg('暂存成功', { icon: 1, time: 2000 });
                } else if (data.d == 2) {
                    layer.msg("暂存成功,但是提交的答案可能存在错误,请重新打开页面检查一下是否提交正确", { icon: 0, time: 2000 });
                } else if (data.d == -1) {
                    layer.alert("提交时间已过", { icon: 2 });
                } else {
                    layer.alert("暂存失败", { icon: 2 });
                }
            }
        });
    }

    //作业提交
    $scope.Test_Submit = function () {
        if ($scope.IsFirefox == 1) {
            EwebeditorByValue();
        }
        var flag = 0;
        for (var i = 0; i < $scope.exerciselist.length; i++) {
            if ($scope.exerciselist[i].ExerciseAnswerComment == "" && $scope.exerciselist[i].ParentExerciseID >= 0 && $scope.exerciselist[i].ExerciseAnswerIsactive == 0) {
                flag++;
            }
        }
        if (flag > 0) {
            layer.msg("您有" + flag + "道题目未完成,请完成后再提交", { icon: 2, time: 2000 });
        } else {
            var msg = "您确认提交吗?";
            if ($scope.test.TimeStatus == 3 && $scope.test.Delay == 3) { //作业考试已结束&&迟交扣分类型作业
                msg = "该测试已到截止时间,继续提交将会扣除一定分值！";
            }
            layer.confirm(msg, { icon: 3, title: '提示' }, function (index) {
                $scope.TestTempSave_Upd(2);
                layer.msg('提交中', { icon: 16 });
                layer.close(index);
            });
        }
    }
    function Submit_Ing() {
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/Test_Submit";
        var param = { TestID: testid };
        $scope.baseService.post(url, param, function (data) {
            if (data.d == 1) {
                layer.msg("提交成功", { icon: 1 }, function () {
                    try {
                        if (window.opener && window.opener.reload_testList) {
                            window.opener.reload_testList();
                        }
                    } catch (e) {

                    }
                    window.close();
                });
            } else if (data.d == -1) {
                layer.alert('登录状态已失效，请在新的页面中重新登录，然后再次提交', { icon: 0 });
            } else {
                layer.alert('提交失败,请重试,或暂存后刷新页面再次提交', { icon: 2 });
            }
            
        });
    }

    //撤回重做
    $scope.Test_Return = function () {

        layer.confirm("您确认撤回重做吗?", { icon: 3, title: '提示' }, function (index) {

            var testid = $scope.testid;
            var url = MarkingProviderUrl + "/TestStudent_Status_Upd";
            var param = { TestID: testid ,Status:10};
            $scope.baseService.post(url, param, function (data) {
                layer.msg("撤回成功! 请按时提交，否则会受迟交扣分的影响", { icon: 1, time: 3000 });
                window.location.reload();
            });
            layer.close(index);
        });

    }


    //自动保存
    var flagdingshi = 0;
    var autosave = function () {
        if ($scope.TestUsers != null && $scope.TestUsers.Status === 20) { //已提交，不再计时
            return;
        }
        if (!checkIsNeedAutoSave())
        {
            setTimeout(autosave, 5000);
            return;
        }
        if (flagdingshi == 30) {
            $scope.TestTempSave_Upd();
            flagdingshi = 0;
        }
        flagdingshi++;
        if (flagdingshi % 10 == 0) console.info(flagdingshi);
        setTimeout(autosave, 1000);
    }

    //判断是否需要开启计时器
    var checkIsNeedAutoSave = function () {
        var bool = false;
        var answer = "";
        if ($scope.isLoad){    //学生答案还未加载，暂时不开启计时
            for (var i = 0; i < $scope.exerciselist.length; i++) {
                if ($scope.exerciselist[i].ParentExerciseID >= 0) {
                    var answer = $scope.exerciselist[i].ExerciseAnswerComment == null ? "" : $.trim($scope.exerciselist[i].ExerciseAnswerComment);
                    if (answer != "") {
                        bool = true;
                        break;
                    }
                }
            }
        }
        
        return bool;
    }

    var cssInit = function () {
        var arr = [];
        for (var i = 0; i < $('.question_list li').length; i++) {
            var _topA = $('.question_list li').eq(i).offset().top;
            arr.push(_topA);
        };

        var ie6 = !-[1, ] && !window.XMLHttpRequest;
        $(window).scroll(function () {
            var _scrollTop = $(document).scrollTop();
            if (!ie6) {
                setTimeout(function () {
                    for (var j = 0; j < $('.question_list li').length; j++) {
                        if (_scrollTop >= arr[j]) {
                            $('.question_num li').removeClass('active');
                            $('.question_num li').eq(j).addClass('active')

                        } else if (_scrollTop < arr[0]) {
                            $('.question_num li').removeClass('active');
                        }
                    };
                }, 200);
            };
        });



        //var ie6 = !-[1, ] && !window.XMLHttpRequest;
        //$(window).scroll(function () {
        //    var _scrollTop = $(document).scrollTop();
        //    if (!ie6) {
        //        setTimeout(function () {
        //            for (var j = 0; j < $('.question_list li').length; j++) {
        //                //var _top = $('.section').eq(j).offset().top;

        //            };
        //        }, 200);
        //    };
        //});
    }
    var EwebeditorByValue = function () {
        $("iframe").each(function (sender, id) {
            // debugger;
            var arr_v = "";
            if (id.id != "") {
                arr_v = document.getElementById(id.id).contentWindow.getHTML();
                var type = 0;
                if (arr_v != "") {
                    type = 1;
                }

                var ExerciseID = id.id.split('_')[1];
                //alert(type);
                ExerciseAnswerComment(ExerciseID, arr_v, type);
            }
        });
    }



    var Init = function () {

        var userAgent = navigator.userAgent,
              rMsie = /(msie\s|trident.*rv:)([\w.]+)/,
              rFirefox = /(firefox)\/([\w.]+)/,
              rOpera = /(opera).+version\/([\w.]+)/,
              rChrome = /(chrome)\/([\w.]+)/,
              rSafari = /version\/([\w.]+).*(safari)/;
        var browser;
        var version;
        var ua = userAgent.toLowerCase();
        function uaMatch(ua) {
            var match = rMsie.exec(ua);
            if (match != null) {
                return { browser: "IE", version: match[2] || "0" };
            }
            var match = rFirefox.exec(ua);
            if (match != null) {
                return { browser: match[1] || "", version: match[2] || "0" };
            }
            var match = rOpera.exec(ua);
            if (match != null) {
                return { browser: match[1] || "", version: match[2] || "0" };
            }
            var match = rChrome.exec(ua);
            if (match != null) {
                return { browser: match[1] || "", version: match[2] || "0" };
            }
            var match = rSafari.exec(ua);
            if (match != null) {
                return { browser: match[2] || "", version: match[1] || "0" };
            }
            if (match != null) {
                return { browser: "", version: "0" };
            }
        }
        var browserMatch = uaMatch(userAgent.toLowerCase());
        if (browserMatch.browser) {
            browser = browserMatch.browser;
            version = browserMatch.version;
            if (browser != "IE") {
                $scope.IsFirefox = 1;
            }
        }

        $scope.IsIE = 1;
        Test_CanSeeTest();
        GetUser();
        cssInit();
        Test_Get();

    }
    Init();

}]);


var ViewResultsModule = angular.module('app.courselive.test.ViewResults', []);
ViewResultsModule.controller('ViewResultsController', ['$scope', '$state', 'MarkingProviderUrl', function ($scope, $state, MarkingProviderUrl) {
    $scope.testid = $G2S.request("TestID");
    $scope.exercisecount = 0;
    $scope.GroupIDS = "";//获取所有分组id
    var surplusmiao = 0;
    var surplusfen = 0;
    var surplusshi = 0;
    //获取试卷题目
    var PaperInfo_Get = function (paperid) {
        // var paperid = 11;
        var userid = $G2S.request("UserID", "-1");
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/MarkingPaperInfo_Get";
        var param = { PaperID: paperid, TestID: testid, UserID: userid };
        $scope.baseService.post(url, param, function (data) {
            $scope.paper = data.d.paper;
            $scope.papergrouplist = data.d.papergrouplist;
            $scope.exerciselist = data.d.exerciselist;
            $scope.ExerciseChoices = data.d.ExerciseChoices;
            if (data.d.paper != null) {
                $scope.Timelimit = data.d.paper.TimeLimit;
            }
            //$scope.exercisecount = $scope.exerciselist.length;
            $scope.exerciseConten = $scope.paper.Brief;
            
            TestAnswer_Get();
        });

        $scope.$on('ngViewResultsLoadMark', function (ngRepeatFinishedEvent) {
            for (var i = 0; i < $scope.papergrouplist.length; i++) {
                $scope.GroupIDS = $scope.papergrouplist[i].GroupID + ",";
                var count = 0;
                var score = 0;
                var countscore = 0;
                for (var k = 0; k < $scope.exerciselist.length; k++) {
                    if (parseInt($scope.exerciselist[k].ParentExerciseID) < 0) {
                        $scope.exerciselist[k].ParentExerciseID = "-1";
                    }
                    if ($scope.papergrouplist[i].GroupID == $scope.exerciselist[k].PaperGroupID && $scope.exerciselist[k].ParentExerciseID != "-1") {
                        count++;
                        score = score + parseFloat($scope.exerciselist[k].Score);
                        $scope.exercisecount++;
                    }
                    if (parseInt(score) <= 0) {
                        score = 100;
                    }
                    countscore = countscore + score;
                    $("#b_exercise_" + $scope.papergrouplist[i].GroupID).html(count);
                    $("#b_exercisescore_" + $scope.papergrouplist[i].GroupID).html(score);
                }
            }
            if (parseInt($scope.paper.Score) <= 0) {
                $scope.paper.Score = countscore;
            }
            $scope.paper.Score = 100;
        });  
    }


    var GetUser = function () {
        var userid = $G2S.request("UserID", "-1");
        var url = MarkingProviderUrl + "/GetUserByUserID";
        var param = { UserID: userid };
        $scope.baseService.post(url, param, function (data) {
            $scope.User = data.d;
        });
    }

    //获取答案
    var TestAnswer_Get = function () {
        var testid = $scope.testid;
        var userid = $G2S.request("UserID", "-1");
        var url = MarkingProviderUrl + "/TestAnswer_Get";
        var param = { TestID: testid, CheckUserID: userid };
        $scope.baseService.post(url, param, function (data) {  // 调用承诺API获取数据 .resolve
            $scope.AllScore = 0;
            if (data.d.ExerciseAnswerUsers != null) {
                $scope.UseTime = data.d.ExerciseAnswerUsers.UseTime;
            } else {
                $scope.UseTime = 0;
            }
            $scope.TestAnswer = data.d.ExerciseAnswers;
            $scope.TestUsers = data.d.TestUsers;
            //if ($scope.TestUsers.Status < 20) {
            //    window.location.href = "../../CourseLive/Test/StudentWorkList";
            //    return;
            //}
            $scope.Evaluatevalue = "|-|Ac|<";
            for (var i = 0; i < $scope.TestAnswer.length; i++) {
                var rows = $scope.TestAnswer[i];
                var flagisactive = 0;
                if (parseFloat(rows.Score) > 0) {
                    flagisactive = 1;
                }
                $scope.AllScore += parseFloat(rows.Score);
                ExerciseAnswerComment(rows.ExerciseID, flagisactive);
                if (rows.IsComment != 1) {
                   
                    $("#pingyu_" + rows.ExerciseID).hide();
                }

                if (rows.Conten != "") {
                    if (rows.ExerciseType == 1) {
                        $scope.ExerciseChoicesClick(rows.ExerciseID, rows.Conten);
                    } else if (rows.ExerciseType == 2 || rows.ExerciseType == 3) {
                        var str = rows.Conten.split('wshgkjqbwhfbxlfrh_c');
                        if (str.length > 1) {
                            for (var kk = 0; kk < str.length; kk++) {
                                $('input[name="xuanze_' + rows.ExerciseID + '"]').each(function () {
                                    if ($(this).attr('pid') == str[kk]) {
                                        $(this).attr("checked", true);
                                        return;
                                    }
                                });
                            }
                        } else {
                            $('input[name="xuanze_' + rows.ExerciseID + '"]').each(function () {
                                if ($(this).attr('pid') == str) {
                                    $(this).attr("checked", true);
                                } else {
                                    $(this).attr("checked", false);
                                }
                            });
                        }
                    } else if (rows.ExerciseType == 4 || rows.ExerciseType == 11) {
                        if (document.getElementById("txt_" + rows.ExerciseID)) {
                            $("#txt_" + rows.ExerciseID).val(rows.Conten);
                            $("#sp_" + rows.ExerciseID).text(rows.Score);
                        }
                    } else if (rows.ExerciseType == 5 || rows.ExerciseType == 18) {
                        if (document.getElementById("txt_" + rows.ExerciseID)) {
                            $("#txt_" + rows.ExerciseID).val(rows.Conten);
                            $("#sp_" + rows.ExerciseID).text(rows.Score);
                        }
                        $("#txt_" + rows.ExerciseID).text(rows.Conten);
                    } else if (rows.ExerciseType == 8 || rows.ExerciseType == 9 || rows.ExerciseType == 10 || rows.ExerciseType == 13) {
                        try {
                            $("#oEditor_" + rows.ExerciseID).val(rows.Conten);
                            $("#sp_" + rows.ExerciseID).text(rows.Score);
                            var editor = EWEBEDITOR.Replace("oEditor_" + rows.ExerciseID, { style: "Markingmini", width: "900", height: "220" });
                        } catch (e) {
                        }
                    }
                }
            }
            $scope.yanchengji = 0;
            if ($scope.TestUsers.IsDelay == 1 && $scope.test.Delay == 3) {
                $scope.yanchengji = $scope.AllScore;
                var zhekou = $scope.AllScore * $scope.test.DelayScoreDiscount / 100;
                zhekou = zhekou.toFixed(1);
                $scope.AllScore = $scope.AllScore - zhekou;
            } else {
                $scope.yanchengji = $scope.AllScore;
            }
            
        });

        $scope.$on('ngViewResultsLoadOrde', function (ngRepeatFinishedEvent) {
            var flag = 0;
            $(".num_box li").each(function () {
                flag++;
                $(this).attr("index", flag);
                var orde = $(this).attr("orde");
                var exerciseid = $(this).attr("pid");
               
                $("#li_" + exerciseid).html(flag);
                $("#spa_" + exerciseid).text(flag + ".");
              
                
            });
            $('.num_box li').live('click', function () {
                //debugger;
                //var _num = $(this).attr("index");
                // var count = $(this).parent().index($('.question_num'));
                var exerciseid = $(this).attr("pid");
                var _top = $("#spa_" + exerciseid).offset().top;
                $('html,body').animate({ 'scrollTop': _top }, 500);
            })
        });
    }

    //判断对错
    var ExerciseAnswerComment = function (ExerciseID, isactive) {
        for (var i = 0; i < $scope.exerciselist.length; i++) {
            if (ExerciseID == $scope.exerciselist[i].ExerciseID) {
                $scope.exerciselist[i].ExerciseAnswerIsactive = isactive;
                break;
            }
        }
    }

    $scope.ExerciseChoicesClick = function (ExerciseID, type) {
        if (type == 1) {
            $("#panduan_" + ExerciseID + "_" + 0).removeClass("active");
        } else {
            $("#panduan_" + ExerciseID + "_" + 1).removeClass("active");
        }
        $("#panduan_" + ExerciseID + "_" + type).addClass("active");

    }

    //获取评语
    $scope.TestUser_comment = function (coexercise) {
        $scope.coexercise = coexercise;    
        Test_Comment_list(coexercise);
        $('#myModal').modal('show');
    }

    //参考答案火药 
    $scope.TestUser_Answer = function (exercise) {
        var analysis = $G2S.isEmpty(exercise.Analysis) ? "<span style='color:#f00;font-size:14px'>暂无习题解析！</span>" :  exercise.Analysis ;
        var txt_Answer = $G2S.isEmpty(exercise.Answer) ? "<span style='color:#f00;font-size:14px'>暂无参考答案！</span>" : exercise.Answer.replace("wshgkjqbwhfbxlfrh_c", ",");
        var tmpHtml = $("#pop_answer_tmp").html();
        tmpHtml = tmpHtml.replace(/\[\[Answer\]\]/g, txt_Answer).replace(/\[\[Analysis\]\]/g, analysis).replace(/\[\[height\]\]/g, "200px");
        layer.open({
            type: 1,
            title: "参考答案",
            area: ['800px','550px'], //宽高
            content: tmpHtml
        });
    }

    //获取评语2
    var Test_Comment_list = function (coexercise) {
        var testid = $scope.testid;
        var userid = $G2S.request("UserID", "-1");
        var url = MarkingProviderUrl + "/Test_Comment_list";
        var param = { TestID: testid, StudentUserID: userid, ExerciseID: coexercise };
        $scope.baseService.post(url, param, function (data) {
            $scope.Commentlist = data.d;

        });
    }
    //获取总评语
    var Test_Comment_list2 = function () {
        //debugger;
        var testid = $scope.testid;
        var userid = $G2S.request("UserID", "-1");
        var url = MarkingProviderUrl + "/Test_Comment_list";
        var param = { TestID: testid, StudentUserID: userid, ExerciseID: 0 };
        $scope.baseService.post(url, param, function (data) {
            $scope.ZongCommentlist = data.d;
            $scope.zongcommentlength = data.d.length;

        });
    }

    //部分 收缩 展示
    $scope.GroupUpDown = function (index) {
        if ($(".ico_showhide").eq(index).attr("tid") == "1") {
            // var kid = $(thi).attr("kid");
            //$("#question_num_" + kid).hide();
            $(".num_box").eq(index).hide();
            $(".ico_showhide").eq(index).attr("tid", "2");
            $(".ico_showhide").eq(index).removeClass("ico_up");
            $(".ico_showhide").eq(index).addClass("ico_down ico_showhide");

        } else {
            $(".num_box").eq(index).show();
            $(".ico_showhide").eq(index).attr("tid", "1");
            $(".ico_showhide").eq(index).removeClass("ico_down");
            $(".ico_showhide").eq(index).addClass("ico_up ico_showhide");
        }
    }

    //关闭
    $scope.backClose = function () {
        window.close();
    }

    $scope.AnswerIsTrue = function (s1, s2) {
        //var vrrs1 = s1.split('wshgkjqbwhfbxlfrh_c');
        if (s1 != null && s1 != '' && s1 != undefined) {
            var vrrs1 = s1.split(',');
            for (var i = 0; i < vrrs1.length; i++) {
                if (vrrs1[i] == s2) {
                    return true;
                }
            }
        }
    }



    var cssInit = function () {

        $('.remark_box').hover(function () {
            $(this).find('span').toggle();
        })
        var arr = [];
        for (var i = 0; i < $('.section_work').length; i++) {
            var _topA = $('.section_work').eq(i).offset().top;
            arr.push(_topA);
        };

        var ie6 = !-[1, ] && !window.XMLHttpRequest;
        $(window).scroll(function () {
            var _scrollTop = $(document).scrollTop();
            if (!ie6) {
                setTimeout(function () {
                    for (var j = 0; j < $('.section_work').length; j++) {
                        //var _top = $('.section').eq(j).offset().top;
                        if (_scrollTop >= arr[j]) {
                            $('.num_box li').eq(j).addClass('thisLi').siblings().removeClass('thisLi');
                        } else if (_scrollTop < arr[0]) {
                            $('.num_box li').removeClass('thisLi');
                        }
                    };
                }, 200);
            };
        });
    }


    //获取考试详细
    var Test_Get = function () {
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/Test_Get";
        var param = { TestID: testid };
        $scope.baseService.post(url, param, function (data) {
            $scope.test = data.d;
            $scope.ScaleTypeName = $scope.test.ScaleTypeName     
            PaperInfo_Get($scope.test.PaperID);
        });

    }
    var Init = function () {
        cssInit();
        GetUser();
        Test_Get();
        Test_Comment_list2();
    }
    Init();
}]);

ViewResultsModule.controller('CardViewResultsController', ['$scope', '$state', 'MarkingProviderUrl', function ($scope, $state, MarkingProviderUrl) {
    $scope.testid = $G2S.request("TestID");
    $scope.pre = $G2S.request("pre");
    $scope.Timelimit = 0;
    var surplusmiao = 0;
    var surplusfen = 0;
    var surplusshi = 0;
    //获取考试详细
    var Test_Get = function () {
        var testid = $scope.testid;
        var url = MarkingProviderUrl + "/Test_Get";
        var param = { TestID: testid };
        $scope.baseService.post(url, param, function (data) {
            $scope.test = data.d;
            $scope.ScaleTypeName = $scope.test.ScaleTypeName;
            PaperCardInfo_Get($scope.test.PaperID);
            setTimeout(TestAnswer_Get, 1000);
        });
    }

    //获取试卷详细
    var PaperCardInfo_Get = function (paperid) {
        var url = MarkingProviderUrl + "/PaperCardInfo_Get";
        var param = { PaperID: paperid };
        $scope.baseService.post(url, param, function (data) {
            $scope.paper = data.d.paper;
            $scope.Timelimit = data.d.paper.TimeLimit;
            $scope.PaperCardList = data.d.papercardexerciselist;
            var pre = $scope.pre;
            if (pre != undefined) {
                $(".bottom_bg").hide();
            }


        });

        $scope.$on('ngonCardExercise', function (ngRepeatFinishedEvent) {

            //setTimeout(TestAnswer_Get, 1000);
        });
    }

    //获取答案
    var TestAnswer_Get = function () {
        var testid = $scope.testid;
        var userid = $G2S.request("UserID", "-1");
        var url = MarkingProviderUrl + "/TestAnswer_Get";
        var param = { TestID: testid, CheckUserID: userid };
        var promise = $scope.baseService.postPromise(url, param);
        promise.then(function (data) {  // 调用承诺API获取数据 .resolve
            // debugger;
            $scope.AllScore = 0;
            if (data.d.ExerciseAnswerUsers != null) {
                $scope.UseTime = data.d.ExerciseAnswerUsers.UseTime;
            } else {
                $scope.UseTime = 0;
            }
            $scope.TestAnswer = data.d.ExerciseAnswers;
            $scope.TestUsers = data.d.TestUsers;

            $scope.Evaluatevalue = "|-|Ac|<";

            if ($scope.TestUsers.Status < 23) {
                $(".btn_answer").show();
            }
            for (var i = 0; i < $scope.TestAnswer.length; i++) {
                var rows = $scope.TestAnswer[i];

                $scope.AllScore += parseFloat(rows.Score);

                if (rows.ExerciseType == 1 || rows.ExerciseType == 2) {
                    // $scope.Cardxuanzhong(rows.ExerciseType, rows.ExerciseID, rows.Conten);
                } else if (rows.ExerciseType == 3) {
                    var str = rows.Conten.split('wshgkjqbwhfbxlfrh_c');
                    for (var kk = 0; kk < str.length; kk++) {
                        //$scope.Cardxuanzhong(rows.ExerciseType, rows.ExerciseID, str[kk]);
                    }
                } else if (rows.ExerciseType == 4) {
                    $("#txt_" + rows.ExerciseID).text(rows.Conten);
                    // $scope.Cardxuanzhong(rows.ExerciseType, rows.ExerciseID, rows.Conten);
                } else if (rows.ExerciseType == 5) {
                    try {
                        document.getElementById('frmoEditor_' + rows.ExerciseID).contentWindow.setHTML(rows.Conten);
                    } catch (e) {
                    }

                    // $scope.Cardxuanzhong(rows.ExerciseType, rows.ExerciseID, rows.Conten);
                }
            }
            $scope.yanchengji = 0;
            if ($scope.TestUsers.IsDelay == 1 && $scope.test.Delay == 3) {
                $scope.yanchengji = $scope.AllScore;
                var zhekou = $scope.AllScore * $scope.test.DelayScoreDiscount / 100;
                zhekou = zhekou.toFixed(1);
                $scope.AllScore = $scope.AllScore - zhekou;
            } else {
                $scope.yanchengji = $scope.AllScore;
            }
        }).then(function () {  // 调用承诺API获取数据 .resolve  

        });
    }

    $scope.$on('ngViewResultsMarkCardExercise', function (ngRepeatFinishedEvent) {
        setTimeout(zhengque, 600);
    });

    //正确答案打钩
    var zhengque = function () {
        for (var i = 0; i < $scope.PaperCardList.length; i++) {
            var rows = $scope.PaperCardList[i];
            if (rows.ExerciseType == 1 || rows.ExerciseType == 2) {
                $("#i_" + rows.CardExerciseID + "_" + rows.Answer).addClass("icon_test true_btn");
            } else if (rows.ExerciseType == 3) {
                var str = rows.Answer.split('wshgkjqbwhfbxlfrh_c');
                for (var kk = 0; kk < str.length; kk++) {
                    $("#i_" + rows.CardExerciseID + "_" + str[kk]).addClass("icon_test true_btn");
                }
            }
        }
    }

    //获取评语
    $scope.TestUser_comment = function (coexercise) {
        $scope.coexercise = coexercise;
        Test_Comment_list($scope.coexercise);
        layer.open({
            type: 1,
            title: "查看评语",
            offset: ['100px'],
            shadeClose: true,
            area: ['555px', '260px'], //宽高
            content: $('#box')
        });

      
    }

    //获取评语2
    var Test_Comment_list = function (coexercise) {

        $scope.Commentlist = [];
        var testid = $scope.testid;
        var userid = $G2S.request("UserID", "-1");
        var url = MarkingProviderUrl + "/Test_Comment_list";
        var param = { TestID: testid, StudentUserID: userid, ExerciseID: coexercise };
        $scope.baseService.post(url, param, function (data) {
            $scope.Commentlist =data.d;
       
        });
    }
    //获取总评语
    var Test_Comment_list2 = function () {
        var testid = $scope.testid;
        var userid = $G2S.request("UserID", "-1");
        var url = MarkingProviderUrl + "/Test_Comment_list";
        var param = { TestID: testid, StudentUserID: userid, ExerciseID: 0 };
        $scope.baseService.post(url, param, function (data) {
            $scope.ZongCommentlist = data.d;
            $scope.zongcommentlength = data.d.length;

        });
    }

    $scope.GeneralComment = function () {
        layer.open({
            type: 1,
            title: "查看总评",
            offset: ['100px'],
            shadeClose: true,
            area: ['555px', '260px'], //宽高
            content: $('#box_general')
        });
    }

    //关闭
    $scope.backClose = function () {
        window.close();
    }

    //查看参考答案
    $scope.TestUser_Answer = function (coexercise) {
        // debugger;
        $scope.modalTitle = "查看参考答案";
        $scope.coexercise = coexercise;
        var answer = "";
        for (var i = 0; i < $scope.PaperCardList.length; i++) {
            if ($scope.PaperCardList[i].CardExerciseID == $scope.coexercise) {
                answer=$scope.PaperCardList[i].Answer;
            }
        }
 
        layer.open({
            type: 1,
            title: "查看参考答案",
            offset: ['100px'],
            shadeClose:true,
            area: ['800px', '400px'], //宽高
            content: "<div style='padding:10px; overflow-x:hidden; overflow-y:auto'>" + answer + "</div>"
        });
       // $('#myModal3').modal('show');
    }
    //查看试题解析
    $scope.TestUserstijiexi = function () {
        //$("#div_cont").html($scope.paper.Answer);
        //$('#myModal2').modal('show');

        layer.open({
            type: 1,
            title: "查看试题解析",
            offset: ['100px'],
            shadeClose: true,
            area: ['530px', '260px'], //宽高
            content: "<div style='padding:10px; overflow-x:hidden; overflow-y:auto'>" + $scope.paper.Answer + "</div>"
        });
    }

    document.documentElement.style.paddingBottom = "250px";
    var cssInit = function () {
        $('.fold_btn').live('click', function () {
            if (!$(this).hasClass('click')) {
                $(this).addClass('click');
                $(this).text('↑ 点击展开');
                $(this).next().slideUp();
                document.documentElement.style.paddingBottom = "0";
            } else {
                $(this).removeClass('click');
                $(this).text('↓ 点击收缩');
                $(this).next().slideDown();
                document.documentElement.style.paddingBottom = "250px";
            }
        })

        $('.remark_box').hover(function () {
            $(this).find('span').toggle();
        })
    }
    var Init = function () {
        cssInit();
        //TestUser_SubmitStudent_List();
        Test_Get();
        Test_Comment_list2();
    }
    Init();
}]);

ViewResultsModule.directive('onSubmitStudentByMark', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit('ngSubmitStudentByMark');
                });
            }
        }
    };
});

ViewResultsModule.directive('onViewResultsMarkCardExercise', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit('ngViewResultsMarkCardExercise');
                });
            }
        }
    };
});

ViewResultsModule.directive('onViewResultsLoadMark', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit('ngViewResultsLoadMark');
                });
            }
        }
    };
});

ViewResultsModule.directive('onViewResultsLoadOrde', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit('ngViewResultsLoadOrde');
                });
            }
        }
    };
});


//选项筛选器
ViewResultsModule.filter('choicesFilter', function () {
    return function (item, ExerciseID) {
        return item.filter(function (i) {
            return i.ExerciseID == ExerciseID;
        });
    }
});

ViewResultsModule.filter('sortFilter', function () {
    return function (item, flag) {
        if (flag) {
            item.sort(function () { return 0.5 - Math.random() });
        }
        return item;
    }
});
//习题筛选器
ViewResultsModule.filter('exerciseFilter', function () {
    return function (item, GroupID, PaperID) {
        return item.filter(function (i) {
            return i.PaperID == PaperID && i.PaperGroupID == GroupID && i.ParentExerciseID <= 0;
        });
    }
});

ViewResultsModule.filter('exerciseFilter2', function () {
    return function (item, GroupID, PaperID) {
        return item.filter(function (i) {
            if (i.ParentExerciseID <0) {
                return false;
            } else {
                return i.PaperID == PaperID && i.PaperGroupID == GroupID;
            }
        });
    }
});

ViewResultsModule.filter('exerciseParentFilter', function () {
    return function (item, GroupID, PaperID, ParentExerciseID) {
        return item.filter(function (i) {
            return i.PaperID == PaperID && i.PaperGroupID == GroupID && i.ParentExerciseID == ParentExerciseID;
        });
    }
});

ViewResultsModule.filter('ToNumByLetter', function () {
    return function (s) {
        return { 1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F", 7: "G", 8: "H", 9: "I", 10: "J", 11: "K" }[s]
    }
});


ViewResultsModule.filter('exerciseParentIsshow', function () {
    return function (item) {
        return item.filter(function (i) {
            //debugger;
        });
    }
});
//正确答案筛选
ViewResultsModule.filter('exerciseAnswerIsTrue', function () {
    return function (s1, s2) {
        var vrrs1 = s1.split('wshgkjqbwhfbxlfrh_c');
        for (var i = 0; i < vrrs1.length; i++) {
            return true;
        }
    }
});
