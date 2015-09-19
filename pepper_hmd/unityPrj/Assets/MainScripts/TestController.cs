using UnityEngine;
using System.Collections;

/// <summary>
/// テスト用に値を上書きするコントローラ
/// </summary>
public class TestController : MonoBehaviour {

    [Range(-1.5f, 1.5f)]
    public float TargetHeadYaw;
    [Range(-0.9f, 0.7f)]
    public float TargetHeadPitch;
    [Range(-1.5f, 1.5f)]
    public float TargetLShoulderPitch;
    [Range(-1.5f, 1.5f)]
    public float TargetLShoulderRoll;
    [Range(-1.5f, 1.5f)]
    public float TargetLElbowYaw;
    [Range(-1.5f, 1.5f)]
    public float TargetLElbowRoll;
    [Range(-3.5f, 3.5f)]
    public float TargetLWristYaw;
    [Range(-1.5f, 1.5f)]
    public float TargetLHand;
    [Range(-1.5f, 1.5f)]
    public float TargetRShoulderPitch;
    [Range(-1.5f, 1.5f)]
    public float TargetRShoulderRoll;
    [Range(-1.5f, 1.5f)]
    public float TargetRElbowYaw;
    [Range(-1.5f, 1.5f)]
    public float TargetRElbowRoll;
    [Range(-3.5f, 3.5f)]
    public float TargetRWristYaw;
    [Range(-1.5f, 1.5f)]
    public float TargetRHand;

	// Use this for initialization
	void Start () {
	
	}
	
	// Update is called once per frame
	void Update () {
        if (Main.Instance == null) return;
        Main.Instance.TargetHeadYaw   = TargetHeadYaw;
        Main.Instance.TargetHeadPitch = TargetHeadPitch;
        Main.Instance.TargetLShoulderPitch = TargetLShoulderPitch;
        Main.Instance.TargetLShoulderRoll = TargetLShoulderRoll;
        Main.Instance.TargetLElbowYaw = TargetLElbowYaw;
        Main.Instance.TargetLElbowRoll = TargetLElbowRoll;
        Main.Instance.TargetLWristYaw  = TargetLWristYaw;
        Main.Instance.TargetLHand          = TargetLHand;
        Main.Instance.TargetRShoulderPitch = TargetRShoulderPitch;
        Main.Instance.TargetRShoulderRoll = TargetRShoulderRoll;
        Main.Instance.TargetRElbowYaw = TargetRElbowYaw;
        Main.Instance.TargetRElbowRoll     = TargetRElbowRoll;
        Main.Instance.TargetRWristYaw      = TargetRWristYaw;
        Main.Instance.TargetRHand          = TargetRHand;
	}
}
