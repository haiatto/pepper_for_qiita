using UnityEngine;
using System.Collections;

public class LaserSensorDisp : MonoBehaviour {

    LineRenderer lineRenderer_;

	// Use this for initialization
	void Start () {
        lineRenderer_ = GetComponent<LineRenderer>();
	}
	
	// Update is called once per frame
	void Update () {
        if (Main.Instance.LaserPointList_FrontHorizontal != null)
        {
            var fh = Main.Instance.LaserPointList_FrontHorizontal;
            var lh = Main.Instance.LaserPointList_LeftHorizontal;
            var rh = Main.Instance.LaserPointList_RightHorizontal;

            lineRenderer_.SetVertexCount(fh.Count + lh.Count + rh.Count + 4);

            int idx = 0;
            lineRenderer_.SetPosition(idx++, new Vector3(0, 0, 0));
            for (var ii = 0; ii < fh.Count; ii++)
            {
                var pos = fh[ii];
                lineRenderer_.SetPosition(idx++, new Vector3(pos.x, 0, pos.y));
            }
            lineRenderer_.SetPosition(idx++, new Vector3(0, 0, 0));
            for (var ii = 0; ii < rh.Count; ii++)
            {
                var pos = rh[ii];
                lineRenderer_.SetPosition(idx++, new Vector3(pos.x, 0, pos.y));
            }
            lineRenderer_.SetPosition(idx++, new Vector3(0, 0, 0));
            for (var ii = 0; ii < lh.Count; ii++)
            {
                var pos = lh[ii];
                lineRenderer_.SetPosition(idx++, new Vector3(pos.x, 0, pos.y));
            }
            lineRenderer_.SetPosition(idx++, new Vector3(0, 0, 0));
        }
	}
}
