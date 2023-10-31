package com.cityu.defect.controller;

import com.cityu.defect.common.BaseResponse;
import com.cityu.defect.common.ErrorCode;
import com.cityu.defect.common.ResultUtils;
import com.cityu.defect.exception.BusinessException;
import com.cityu.defect.exception.ThrowUtils;
import com.cityu.defect.model.dto.defectInfo.DefectInfoQueryRequest;
import com.cityu.defect.model.dto.defectInfo.DefectInfoUpdateRequest;
import com.cityu.defect.model.entity.DefectInfo;
import com.cityu.defect.model.entity.User;
import com.cityu.defect.model.vo.DefectInfoVO;
import com.cityu.defect.service.DefectInfoService;
import com.cityu.defect.service.UserService;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Objects;


@RestController
@RequestMapping("/defectInfo")
@Slf4j
public class DefectInfoController {
    @Resource
    private DefectInfoService defectInfoService;
    @Resource
    private UserService userService;
    //改查
    @ApiOperation("修改缺陷")
    @PostMapping("/update")
    public BaseResponse<Boolean> UpdateDefectInfo(@RequestBody DefectInfoUpdateRequest defectInfoUpdateRequest, HttpServletRequest request){
        if (defectInfoUpdateRequest == null || defectInfoUpdateRequest.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        DefectInfo defectInfo = new DefectInfo();
        BeanUtils.copyProperties(defectInfoUpdateRequest, defectInfo);
        // 参数校验
        defectInfoService.validDefectInfo(defectInfo);
        long id = defectInfoUpdateRequest.getId();
        // 判断是否存在
        DefectInfo oldDefectInfo = defectInfoService.getById(id);
        ThrowUtils.throwIf(oldDefectInfo == null, ErrorCode.NOT_FOUND_ERROR);
        boolean result = defectInfoService.updateById(defectInfo);
        return ResultUtils.success(result);
    }

    @ApiOperation("已登录用户条件查询缺陷列表")
    @PostMapping("/search")
    public BaseResponse<List<DefectInfoVO>> searchDefectInfoVO(@RequestBody DefectInfoQueryRequest defectInfoQueryRequest, HttpServletRequest request){
        User loginUser = userService.getLoginUser(request);
        //用户未登录
        if(loginUser == null){
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        Long loginUserId = loginUser.getId();
        //登录用户不能请求其他用户的缺陷列表
        if(!Objects.equals(loginUserId, defectInfoQueryRequest.getUserId())){
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        List<DefectInfo> defectInfoList = defectInfoService.getQueryWrapper(defectInfoQueryRequest);
        return ResultUtils.success(defectInfoService.getDefectInfoVO(defectInfoList));
    }

    /**
     * 获取当前用户的缺陷列表
     */
    @ApiOperation("获取当前登录用户全部缺陷列表")
    @PostMapping("/search/MyDefectInfoVOList")
    public BaseResponse<List<DefectInfoVO>> listMyDefectInfoVO(HttpServletRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        User loginUser = userService.getLoginUser(request);
        if(loginUser == null){
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        Long loginUserId = loginUser.getId();
        List<DefectInfo> defectInfoVOList = defectInfoService.findByUserId(loginUserId);
        return ResultUtils.success(defectInfoService.getDefectInfoVO(defectInfoVOList));
    }
}
