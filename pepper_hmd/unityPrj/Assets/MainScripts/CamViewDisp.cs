using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class CamViewDisp : SingletonMonoBehaviour<MonoBehaviour>
{
    public CamPlane SrcCamPlanePrefab;

    public float UpdateTime = 1.0f;
    
    protected float timer_;
    
    List<CamPlane> camPlaneLst_ = new List<CamPlane>();

    // Use this for initialization
    void Start()
    {
        timer_ = UpdateTime;
    }

    // Update is called once per frame
    void Update()
    {
        timer_ -= Time.deltaTime;
        if (timer_ < 0)
        {
            timer_ += UpdateTime;
            PutCamPlane();
        }
    }
    void PutCamPlane()
    {
        if (Main.Instance.CameraTextureTop)
        {
            camPlaneLst_.Add(Instantiate(SrcCamPlanePrefab) as CamPlane);
        }
    }
}
